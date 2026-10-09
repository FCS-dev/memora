package fcs.memora.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import fcs.memora.auth.RefreshTokenService;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AdminService adminService;

    @Test
    void shouldUpdateStatusToBlockedAndRevokeTokens() {
        User user = user();
        when(userRepository.findByUuidUser("target-uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User updated = adminService.updateStatus("admin-uuid", "target-uuid", new UpdateStatusRequest(UserStatus.BLOCKED));

        assertThat(updated.getUserStatus()).isEqualTo(UserStatus.BLOCKED);
        verify(refreshTokenService).revokeAllByUser(user);
    }

    @Test
    void shouldUpdateStatusToActiveWithoutRevokingTokens() {
        User user = user();
        when(userRepository.findByUuidUser("target-uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User updated = adminService.updateStatus("admin-uuid", "target-uuid", new UpdateStatusRequest(UserStatus.ACTIVE));

        assertThat(updated.getUserStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(refreshTokenService, never()).revokeAllByUser(user);
    }

    @Test
    void shouldPreventAdminFromChangingOwnStatus() {
        assertThatThrownBy(() -> adminService.updateStatus("admin-uuid", "admin-uuid", new UpdateStatusRequest(UserStatus.BLOCKED)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("propio estado");
    }

    @Test
    void shouldThrowWhenUserNotFound() {
        when(userRepository.findByUuidUser("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.updateStatus("admin-uuid", "missing", new UpdateStatusRequest(UserStatus.BLOCKED)))
            .isInstanceOf(UsernameNotFoundException.class);
    }

    private User user() {
        return User.builder()
            .uuidUser("target-uuid")
            .email("target@example.com")
            .name("Target")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
    }
}
