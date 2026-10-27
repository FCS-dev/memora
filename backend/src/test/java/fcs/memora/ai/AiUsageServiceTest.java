package fcs.memora.ai;

import fcs.memora.user.User;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiUsageServiceTest {

    @Mock
    private AiUsageRepository repository;

    private AiUsageService service;
    private User user;
    private Clock clock;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(Instant.parse("2026-10-26T12:00:00Z"), ZoneId.of("UTC"));
        AiProperties properties = new AiProperties(
            true, "key", "https://api.groq.com/openai/v1", "model",
            0.2, 512, 20000, 2, 2500, "1"
        );
        service = new AiUsageService(repository, properties, clock);
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
    void allowsOperationsUnderTheLimit() {
        when(repository.findByUserIdAndUsageDate(1L, today()))
            .thenReturn(Optional.of(usage(1)));

        service.check(user);
    }

    @Test
    void rejectsOperationAtTheLimit() {
        when(repository.findByUserIdAndUsageDate(1L, today()))
            .thenReturn(Optional.of(usage(2)));

        assertThatThrownBy(() -> service.check(user))
            .isInstanceOf(AiQuotaExceededException.class);
    }

    @Test
    void recordsFirstSuccessfulOperation() {
        when(repository.findByUserIdAndUsageDateForUpdate(1L, today())).thenReturn(Optional.empty());
        when(repository.save(any(AiUsage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.recordSuccess(user);

        ArgumentCaptor<AiUsage> captor = ArgumentCaptor.forClass(AiUsage.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getCount()).isEqualTo(1);
        assertThat(captor.getValue().getUsageDate()).isEqualTo(today());
    }

    @Test
    void incrementsExistingSuccessfulOperation() {
        AiUsage existing = usage(1);
        when(repository.findByUserIdAndUsageDateForUpdate(1L, today()))
            .thenReturn(Optional.of(existing));
        when(repository.save(any(AiUsage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.recordSuccess(user);

        ArgumentCaptor<AiUsage> captor = ArgumentCaptor.forClass(AiUsage.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getCount()).isEqualTo(2);
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(ZoneId.systemDefault()));
    }

    private AiUsage usage(int count) {
        return AiUsage.builder()
            .id(10L)
            .user(user)
            .usageDate(today())
            .count(count)
            .build();
    }
}
