package fcs.memora.ai;

import fcs.memora.ai.dto.NoteInterpretationRequest;
import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
import fcs.memora.note.TagService;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;

@SpringBootTest(properties = {
    "memora.ai.enabled=true",
    "memora.ai.api-key=test-key",
    "memora.ai.base-url=https://api.groq.com/openai/v1"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NoteInterpretationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordService passwordService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AiConsentService aiConsentService;

    @Autowired
    private AiUsageRepository aiUsageRepository;

    @MockitoBean
    private NoteDraftExtractor extractor;

    @MockitoBean
    private TagService tagService;

    @Test
    void returnsDraftForUserWithConsent() throws Exception {
        User user = createUser("user@example.com", "uuid-user-1", UserRole.USER);
        aiConsentService.update(user.getUuidUser(), AiConsentAction.GRANTED, "1");
        when(tagService.list(user.getUuidUser())).thenReturn(List.of());
        when(extractor.extract(anyString(), any(), any(), any()))
            .thenReturn(new NoteDraft(
                "Comprar pan", "", false, List.of(), null, null, List.of(), false, List.of()
            ));

        mockMvc.perform(post("/notes/interpret")
                .header("Authorization", "Bearer " + jwtService.generateAccessToken(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"comprar pan\",\"zoneId\":\"America/Argentina/Buenos_Aires\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.draft.title").value(startsWith("Contenido generado por IA · ")))
            .andExpect(jsonPath("$.warnings").isArray());
    }

    @Test
    void returnsNullDraftForMultipleIntents() throws Exception {
        User user = createUser("multi@example.com", "uuid-user-2", UserRole.USER);
        aiConsentService.update(user.getUuidUser(), AiConsentAction.GRANTED, "1");
        when(tagService.list(user.getUuidUser())).thenReturn(List.of());
        when(extractor.extract(anyString(), any(), any(), any()))
            .thenReturn(new NoteDraft(
                "Título", "contenido", false, List.of(), null, null, List.of(), true, List.of()
            ));

        mockMvc.perform(post("/notes/interpret")
                .header("Authorization", "Bearer " + jwtService.generateAccessToken(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"dos notas\",\"zoneId\":\"America/Argentina/Buenos_Aires\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.draft").doesNotExist())
            .andExpect(jsonPath("$.warnings[0]").value("MULTIPLE_INTENTS"));
    }

    @Test
    void requiresConsent() throws Exception {
        User user = createUser("noconsent@example.com", "uuid-user-3", UserRole.USER);

        mockMvc.perform(post("/notes/interpret")
                .header("Authorization", "Bearer " + jwtService.generateAccessToken(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"texto\",\"zoneId\":\"America/Argentina/Buenos_Aires\"}"))
            .andExpect(status().is(428));
    }

    @Test
    void rejectsAdmin() throws Exception {
        User admin = createUser("admin@example.com", "uuid-admin", UserRole.ADMIN);

        mockMvc.perform(post("/notes/interpret")
                .header("Authorization", "Bearer " + jwtService.generateAccessToken(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"texto\",\"zoneId\":\"America/Argentina/Buenos_Aires\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void rejectsOutOfScopeTextWithoutCallingProviderOrCountingQuota() throws Exception {
        User user = createUser("code@example.com", "uuid-user-code", UserRole.USER);
        aiConsentService.update(user.getUuidUser(), AiConsentAction.GRANTED, "1");

        mockMvc.perform(post("/notes/interpret")
                .header("Authorization", "Bearer " + jwtService.generateAccessToken(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"haz el código hola mundo en python\",\"zoneId\":\"Europe/Madrid\"}"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.detail").value("Solo puedo convertir notas, recordatorios y tareas"));

        verify(extractor, never()).extract(anyString(), any(), any(), any());
        assertThat(aiUsageRepository.findByUserIdAndUsageDate(user.getId(), LocalDate.now())).isEmpty();
    }

    @Test
    void mapsProviderOutOfScopeTo422WithoutContentOrQuota() throws Exception {
        User user = createUser("question@example.com", "uuid-user-question", UserRole.USER);
        aiConsentService.update(user.getUuidUser(), AiConsentAction.GRANTED, "1");
        when(tagService.list(user.getUuidUser())).thenReturn(List.of());
        when(extractor.extract(anyString(), any(), any(), any()))
            .thenThrow(new OutOfScopeException());

        mockMvc.perform(post("/notes/interpret")
                .header("Authorization", "Bearer " + jwtService.generateAccessToken(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"hablame de la historia de Roma\",\"zoneId\":\"Europe/Madrid\"}"))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.detail").value("Solo puedo convertir notas, recordatorios y tareas"));

        assertThat(aiUsageRepository.findByUserIdAndUsageDate(user.getId(), LocalDate.now())).isEmpty();
    }

    @Test
    void returnsTagCatalogFailureWithoutCallingExtractor() throws Exception {
        User user = createUser("tags@example.com", "uuid-user-4", UserRole.USER);
        aiConsentService.update(user.getUuidUser(), AiConsentAction.GRANTED, "1");
        when(tagService.list(user.getUuidUser())).thenThrow(new RuntimeException("db down"));

        mockMvc.perform(post("/notes/interpret")
                .header("Authorization", "Bearer " + jwtService.generateAccessToken(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"texto\",\"zoneId\":\"America/Argentina/Buenos_Aires\"}"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.detail").value("No se pudieron cargar las etiquetas"));

        verify(extractor, never()).extract(anyString(), any(), any(), any());
    }

    private User createUser(String email, String uuid, UserRole role) {
        User user = User.builder()
            .uuidUser(uuid)
            .email(email)
            .name("User")
            .passwordHash(passwordService.hashPassword("currentPass"))
            .role(role)
            .userStatus(UserStatus.ACTIVE)
            .avatarColor("#4F5DFF")
            .build();
        return userRepository.save(user);
    }
}
