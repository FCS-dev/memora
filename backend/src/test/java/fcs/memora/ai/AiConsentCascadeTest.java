package fcs.memora.ai;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AiConsentCascadeTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AiConsentRepository aiConsentRepository;

    @Autowired
    private AiUsageRepository aiUsageRepository;

    @Test
    void deletingAccountRemovesConsentHistoryAndUsage() {
        User user = userRepository.save(User.builder()
            .uuidUser("uuid-cascade-user")
            .email("cascade@example.com")
            .name("Cascade")
            .passwordHash("hash")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());

        aiConsentRepository.save(AiConsentEvent.builder()
            .user(user)
            .action(AiConsentAction.GRANTED)
            .noticeVersion("1")
            .createdAt(LocalDateTime.now())
            .build());
        aiUsageRepository.save(AiUsage.builder()
            .user(user)
            .usageDate(LocalDate.now())
            .count(1)
            .build());

        userRepository.delete(user);
        userRepository.flush();

        assertThat(aiConsentRepository.countByUserId(user.getId())).isZero();
        assertThat(aiUsageRepository.findByUserIdAndUsageDate(user.getId(), LocalDate.now())).isEmpty();
    }
}
