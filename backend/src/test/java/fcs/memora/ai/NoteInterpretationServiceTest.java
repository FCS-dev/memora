package fcs.memora.ai;

import fcs.memora.ai.dto.NoteInterpretationRequest;
import fcs.memora.ai.dto.NoteInterpretationResponse;
import fcs.memora.note.TagService;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteInterpretationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AiConsentService aiConsentService;

    @Mock
    private AiUsageService aiUsageService;

    @Mock
    private TagService tagService;

    @Mock
    private ObjectProvider<NoteDraftExtractor> extractorProvider;

    @Mock
    private NoteDraftExtractor extractor;

    private NoteInterpretationService service;
    private AiProperties properties;
    private User user;

    @BeforeEach
    void setUp() {
        properties = new AiProperties(
            true, "key", "https://api.groq.com/openai/v1", "model",
            0.2, 512, 20000, 50, 2500, "1"
        );
        Clock clock = Clock.fixed(Instant.parse("2026-10-26T12:00:00Z"), ZoneId.of("UTC"));
        service = new NoteInterpretationService(
            userRepository, properties, aiConsentService, aiUsageService,
            tagService, extractorProvider, new NoteDraftNormalizer(), clock
        );
        user = User.builder()
            .id(1L)
            .uuidUser("uuid-user")
            .email("user@example.com")
            .name("User")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
        when(userRepository.findByUuidUser("uuid-user")).thenReturn(Optional.of(user));
    }

    @Test
    void rejectsWhenAiIsDisabled() {
        service = new NoteInterpretationService(
            userRepository,
            new AiProperties(false, null, null, null, null, null, null, null, null, null),
            aiConsentService, aiUsageService, tagService, extractorProvider,
            new NoteDraftNormalizer(), Clock.systemUTC()
        );

        assertThatThrownBy(() -> service.interpret("uuid-user", request("texto")))
            .isInstanceOf(AiDisabledException.class);
    }

    @Test
    void rejectsWithoutConsent() {
        when(aiConsentService.isGranted(user)).thenReturn(false);

        assertThatThrownBy(() -> service.interpret("uuid-user", request("texto")))
            .isInstanceOf(AiConsentRequiredException.class);
    }

    @Test
    void rejectsWhenQuotaIsExceeded() {
        when(aiConsentService.isGranted(user)).thenReturn(true);
        org.mockito.Mockito.doThrow(new AiQuotaExceededException()).when(aiUsageService).check(user);

        assertThatThrownBy(() -> service.interpret("uuid-user", request("texto")))
            .isInstanceOf(AiQuotaExceededException.class);
    }

    @Test
    void rejectsCodeRequestWithoutCallingProviderOrQuota() {
        when(aiConsentService.isGranted(user)).thenReturn(true);

        assertThatThrownBy(() -> service.interpret(
            "uuid-user", request("haz el código hola mundo en python")
        )).isInstanceOf(OutOfScopeException.class);

        verify(aiUsageService, never()).check(any());
        verify(aiUsageService, never()).recordSuccess(any());
        verify(extractorProvider, never()).getIfAvailable();
    }

    @Test
    void rejectsTextOverTheLimit() {
        when(aiConsentService.isGranted(user)).thenReturn(true);

        assertThatThrownBy(() -> service.interpret("uuid-user", request("a".repeat(2501))))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsWhenTagsCannotBeLoaded() {
        when(aiConsentService.isGranted(user)).thenReturn(true);
        when(tagService.list("uuid-user")).thenThrow(new RuntimeException("db down"));

        assertThatThrownBy(() -> service.interpret("uuid-user", request("texto")))
            .isInstanceOf(TagCatalogUnavailableException.class);
        verify(extractorProvider, never()).getIfAvailable();
        verify(aiUsageService, never()).recordSuccess(any());
    }

    @Test
    void propagatesProviderOutOfScopeWithoutCountingQuota() {
        when(aiConsentService.isGranted(user)).thenReturn(true);
        when(tagService.list("uuid-user")).thenReturn(List.of());
        when(extractorProvider.getIfAvailable()).thenReturn(extractor);
        when(extractor.extract(anyString(), any(), any(), any()))
            .thenThrow(new OutOfScopeException());

        assertThatThrownBy(() -> service.interpret(
            "uuid-user", request("hablame de la historia de Roma")
        )).isInstanceOf(OutOfScopeException.class);

        verify(aiUsageService, never()).recordSuccess(any());
    }

    @Test
    void returnsDraftAndCountsOneOperation() {
        when(aiConsentService.isGranted(user)).thenReturn(true, true);
        when(tagService.list("uuid-user")).thenReturn(List.of());
        when(extractorProvider.getIfAvailable()).thenReturn(extractor);
        when(extractor.extract(anyString(), any(), any(), any())).thenReturn(draft("Comprar pan", ""));

        NoteInterpretationResponse response = service.interpret(
            "uuid-user", request("comprar pan")
        );

        assertThat(response.draft()).isNotNull();
        assertThat(response.draft().title()).isEqualTo("Contenido generado por IA · 26/10/2026 09:00");
        verify(aiUsageService).recordSuccess(user);
    }

    @Test
    void returnsNullDraftForMultipleIntentsButStillCounts() {
        when(aiConsentService.isGranted(user)).thenReturn(true, true);
        when(tagService.list("uuid-user")).thenReturn(List.of());
        when(extractorProvider.getIfAvailable()).thenReturn(extractor);
        when(extractor.extract(anyString(), any(), any(), any()))
            .thenReturn(draft("Título", "contenido", true));

        NoteInterpretationResponse response = service.interpret(
            "uuid-user", request("dos notas")
        );

        assertThat(response.draft()).isNull();
        assertThat(response.warnings()).contains(AiWarningCode.MULTIPLE_INTENTS);
        verify(aiUsageService).recordSuccess(user);
    }

    @Test
    void discardsResultIfConsentWasRevokedDuringExtraction() {
        when(aiConsentService.isGranted(user)).thenReturn(true, false);
        when(tagService.list("uuid-user")).thenReturn(List.of());
        when(extractorProvider.getIfAvailable()).thenReturn(extractor);
        when(extractor.extract(anyString(), any(), any(), any())).thenReturn(draft("Título", ""));

        assertThatThrownBy(() -> service.interpret("uuid-user", request("texto")))
            .isInstanceOf(AiConsentRequiredException.class);
        verify(aiUsageService, never()).recordSuccess(any());
    }

    private NoteInterpretationRequest request(String text) {
        return new NoteInterpretationRequest(text, "America/Argentina/Buenos_Aires");
    }

    private NoteDraft draft(String title, String content) {
        return draft(title, content, false);
    }

    private NoteDraft draft(String title, String content, boolean multipleIntents) {
        return new NoteDraft(
            title, content, false, List.of(), null, null, List.of(), multipleIntents, List.of()
        );
    }
}
