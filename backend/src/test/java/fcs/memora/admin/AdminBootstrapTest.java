package fcs.memora.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import fcs.memora.auth.PasswordService;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordService passwordService;

    @InjectMocks
    private AdminBootstrap adminBootstrap;

    private AdminBootstrap createBootstrap(String email, String password) {
        return new AdminBootstrap(email, password, userRepository, passwordService);
    }

    @Test
    void shouldCreateAdminWhenDatabaseIsEmptyAndCredentialsProvided() {
        AdminBootstrap bootstrap = createBootstrap("admin@memora.local", "securePassword123");
        when(userRepository.count()).thenReturn(0L);
        when(passwordService.hashPassword("securePassword123")).thenReturn("hashedPassword");

        bootstrap.run();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("admin@memora.local");
        assertThat(saved.getRole()).isEqualTo(UserRole.ADMIN);
    }

    @Test
    void shouldSkipWhenUsersAlreadyExist() {
        AdminBootstrap bootstrap = createBootstrap("admin@memora.local", "securePassword123");
        when(userRepository.count()).thenReturn(5L);

        bootstrap.run();

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldFailWhenAdminEmailIsMissing() {
        AdminBootstrap bootstrap = createBootstrap("", "securePassword123");
        when(userRepository.count()).thenReturn(0L);

        assertThatThrownBy(bootstrap::run)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ADMIN_EMAIL");
    }

    @Test
    void shouldFailWhenAdminPasswordIsMissing() {
        AdminBootstrap bootstrap = createBootstrap("admin@memora.local", "");
        when(userRepository.count()).thenReturn(0L);

        assertThatThrownBy(bootstrap::run)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ADMIN_PASSWORD");
    }
}
