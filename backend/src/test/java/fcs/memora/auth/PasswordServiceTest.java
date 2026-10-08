package fcs.memora.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class PasswordServiceTest {

    private final PasswordService passwordService = new PasswordService(new BCryptPasswordEncoder());

    @Test
    void shouldHashPassword() {
        String rawPassword = "securePassword123";
        String hash = passwordService.hashPassword(rawPassword);

        assertThat(hash).isNotNull();
        assertThat(hash).isNotEqualTo(rawPassword);
        assertThat(hash).startsWith("$2a$");
    }

    @Test
    void shouldMatchPassword() {
        String rawPassword = "securePassword123";
        String hash = passwordService.hashPassword(rawPassword);

        assertThat(passwordService.matchesPassword(rawPassword, hash)).isTrue();
        assertThat(passwordService.matchesPassword("wrongPassword", hash)).isFalse();
    }
}
