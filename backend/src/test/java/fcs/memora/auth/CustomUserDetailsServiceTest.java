package fcs.memora.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void shouldLoadUserByUuid() {
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("test@example.com")
            .name("Test")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();

        when(userRepository.findByUuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")).thenReturn(Optional.of(user));

        UserDetails details = customUserDetailsService.loadUserByUsername("uuiduuiduuiduuiduuiduuiduuiduuid");

        assertThat(details.getUsername()).isEqualTo("uuiduuiduuiduuiduuiduuiduuiduuid");
        assertThat(details.getAuthorities()).extracting("authority").containsExactly("ROLE_USER");
    }

    @Test
    void shouldThrowWhenUserNotFound() {
        when(userRepository.findByUuidUser("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> customUserDetailsService.loadUserByUsername("missing"))
            .isInstanceOf(UsernameNotFoundException.class);
    }
}
