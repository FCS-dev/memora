package fcs.memora.auth;

import static org.assertj.core.api.Assertions.assertThat;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class RefreshTokenServiceTest {

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldCreateAndFindRefreshToken() {
        User user = userRepository.save(User.builder()
            .uuidUser("refreshuser123456789012345678901")
            .email("refresh@example.com")
            .name("Refresh User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());

        RefreshToken token = refreshTokenService.createRefreshToken(user);

        assertThat(token.getToken()).isNotBlank();
        assertThat(token.getUser().getId()).isEqualTo(user.getId());
        assertThat(token.getExpiryDate()).isNotNull();
        assertThat(token.isRevoked()).isFalse();

        RefreshToken found = refreshTokenService.findByToken(token.getToken()).orElseThrow();
        assertThat(found.getId()).isEqualTo(token.getId());
    }

    @Test
    void shouldRevokeAllByUser() {
        User user = userRepository.save(User.builder()
            .uuidUser("revokeuser1234567890123456789012")
            .email("revoke@example.com")
            .name("Revoke User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());

        refreshTokenService.createRefreshToken(user);
        refreshTokenService.createRefreshToken(user);

        assertThat(refreshTokenRepository.countByUserAndRevokedFalse(user)).isEqualTo(2L);

        refreshTokenService.revokeAllByUser(user);

        assertThat(refreshTokenRepository.countByUserAndRevokedFalse(user)).isEqualTo(0L);
    }
}
