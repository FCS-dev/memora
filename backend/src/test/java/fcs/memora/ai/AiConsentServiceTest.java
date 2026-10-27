package fcs.memora.ai;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiConsentServiceTest {

    @Mock
    private AiConsentRepository repository;

    @Mock
    private UserRepository userRepository;

    private AiConsentService service;
    private User user;

    @BeforeEach
    void setUp() {
        AiProperties properties = new AiProperties(
            true, "key", "https://api.groq.com/openai/v1", "model",
            0.2, 512, 20000, 50, 2500, "1"
        );
        service = new AiConsentService(repository, userRepository, properties);
        user = User.builder()
            .id(1L)
            .uuidUser("uuid-user")
            .email("user@example.com")
            .name("User")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
    }

    @Test
    void returnsNotSetWithoutEvents() {
        when(repository.findTopByUserIdOrderByIdDesc(1L)).thenReturn(Optional.empty());

        assertThat(service.state(user)).isEqualTo(ConsentState.NOT_SET);
        assertThat(service.isGranted(user)).isFalse();
        assertThat(service.requiresConsent(user)).isTrue();
    }

    @Test
    void returnsGrantedForCurrentVersion() {
        when(repository.findTopByUserIdOrderByIdDesc(1L))
            .thenReturn(Optional.of(event(AiConsentAction.GRANTED, "1")));

        assertThat(service.state(user)).isEqualTo(ConsentState.GRANTED);
        assertThat(service.isGranted(user)).isTrue();
        assertThat(service.requiresConsent(user)).isFalse();
    }

    @Test
    void requiresConsentWhenGrantedVersionIsOutdated() {
        when(repository.findTopByUserIdOrderByIdDesc(1L))
            .thenReturn(Optional.of(event(AiConsentAction.GRANTED, "0")));

        assertThat(service.state(user)).isEqualTo(ConsentState.GRANTED);
        assertThat(service.isGranted(user)).isFalse();
        assertThat(service.requiresConsent(user)).isTrue();
    }

    @Test
    void deniedAndRevokedDoNotRequireAutomaticPrompt() {
        when(repository.findTopByUserIdOrderByIdDesc(1L))
            .thenReturn(Optional.of(event(AiConsentAction.DENIED, "1")));
        assertThat(service.state(user)).isEqualTo(ConsentState.DENIED);
        assertThat(service.requiresConsent(user)).isFalse();

        when(repository.findTopByUserIdOrderByIdDesc(1L))
            .thenReturn(Optional.of(event(AiConsentAction.REVOKED, "1")));
        assertThat(service.state(user)).isEqualTo(ConsentState.REVOKED);
        assertThat(service.requiresConsent(user)).isFalse();
    }

    @Test
    void updateRecordsTheRequestedAction() {
        when(userRepository.findByUuidUser("uuid-user")).thenReturn(Optional.of(user));
        when(repository.save(any(AiConsentEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.update("uuid-user", AiConsentAction.GRANTED, "1");

        ArgumentCaptor<AiConsentEvent> captor = ArgumentCaptor.forClass(AiConsentEvent.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getAction()).isEqualTo(AiConsentAction.GRANTED);
        assertThat(captor.getValue().getNoticeVersion()).isEqualTo("1");
        assertThat(captor.getValue().getUser()).isSameAs(user);
    }

    @Test
    void rejectsUnknownNoticeVersion() {
        when(userRepository.findByUuidUser("uuid-user")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.update("uuid-user", AiConsentAction.GRANTED, "99"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("La versión del aviso no es válida");
    }

    private AiConsentEvent event(AiConsentAction action, String version) {
        return AiConsentEvent.builder()
            .id(10L)
            .user(user)
            .action(action)
            .noticeVersion(version)
            .createdAt(LocalDateTime.now())
            .build();
    }
}
