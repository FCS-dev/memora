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
class JwtServiceTest {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldGenerateAndValidateAccessToken() {
        User user = userRepository.save(User.builder()
            .uuidUser("jwtusertoken12345678901234567890")
            .email("jwt@example.com")
            .name("Jwt User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());

        String token = jwtService.generateAccessToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUsername(token)).isEqualTo(user.getUuidUser());
        assertThat(jwtService.isTokenValid(token)).isTrue();
    }
}
