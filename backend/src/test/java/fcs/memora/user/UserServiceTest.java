package fcs.memora.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import fcs.memora.ai.AiConsentService;
import fcs.memora.ai.AiProperties;
import fcs.memora.ai.ConsentState;
import fcs.memora.auth.PasswordService;
import fcs.memora.auth.RefreshTokenService;
import fcs.memora.user.dto.ChangePasswordRequest;
import fcs.memora.user.dto.UpdateProfileRequest;
import fcs.memora.user.dto.UserProfileResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordService passwordService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private AiConsentService aiConsentService;

    @Mock
    private AiProperties aiProperties;

    @InjectMocks
    private UserService userService;

    @Test
    void shouldGetProfile() {
        User user = activeUser();
        when(userRepository.findByUuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")).thenReturn(Optional.of(user));
        stubAiProfile();

        UserProfileResponse response = userService.getProfile("uuiduuiduuiduuiduuiduuiduuiduuid");

        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.name()).isEqualTo("User");
        assertThat(response.role()).isEqualTo("USER");
        assertThat(response.avatarColor()).isEqualTo("#4F5DFF");
        assertThat(response.aiEnabled()).isFalse();
        assertThat(response.aiConsent()).isEqualTo("NOT_SET");
        assertThat(response.aiConsentRequired()).isTrue();
        assertThat(response.aiConsentNoticeVersion()).isEqualTo("1");
    }

    @Test
    void shouldUpdateProfile() {
        User user = activeUser();
        when(userRepository.findByUuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        stubAiProfile();

        UserProfileResponse response = userService.updateProfile(
            "uuiduuiduuiduuiduuiduuiduuiduuid",
            new UpdateProfileRequest("New Name", "#059669")
        );

        assertThat(response.name()).isEqualTo("New Name");
        assertThat(response.avatarColor()).isEqualTo("#059669");
    }

    @Test
    void shouldChangePasswordAndRevokeTokens() {
        User user = activeUser();
        when(userRepository.findByUuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")).thenReturn(Optional.of(user));
        when(passwordService.matchesPassword("currentPass", "hashedPassword")).thenReturn(true);
        when(passwordService.hashPassword("newPass123")).thenReturn("newHashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        userService.changePassword("uuiduuiduuiduuiduuiduuiduuiduuid", new ChangePasswordRequest("currentPass", "newPass123"));

        assertThat(user.getPasswordHash()).isEqualTo("newHashedPassword");
        verify(refreshTokenService).revokeAllByUser(user);
    }

    @Test
    void shouldRejectChangePasswordWhenCurrentPasswordIsWrong() {
        User user = activeUser();
        when(userRepository.findByUuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")).thenReturn(Optional.of(user));
        when(passwordService.matchesPassword("wrongPass", "hashedPassword")).thenReturn(false);

        assertThatThrownBy(() -> userService.changePassword("uuiduuiduuiduuiduuiduuiduuiduuid", new ChangePasswordRequest("wrongPass", "newPass123")))
            .isInstanceOf(BadCredentialsException.class);
        verify(refreshTokenService, never()).revokeAllByUser(any());
    }

    @Test
    void shouldThrowWhenBlockedUser() {
        User user = activeUser();
        user.setUserStatus(UserStatus.BLOCKED);
        when(userRepository.findByUuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> userService.getProfile("uuiduuiduuiduuiduuiduuiduuiduuid"))
            .isInstanceOf(DisabledException.class);
    }

    private User activeUser() {
        return User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("user@example.com")
            .name("User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .avatarColor("#4F5DFF")
            .build();
    }

    private void stubAiProfile() {
        when(aiProperties.enabled()).thenReturn(false);
        when(aiProperties.noticeVersion()).thenReturn("1");
        when(aiConsentService.state(any(User.class))).thenReturn(ConsentState.NOT_SET);
        when(aiConsentService.requiresConsent(any(User.class))).thenReturn(true);
    }
}
