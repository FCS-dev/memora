package fcs.memora.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import fcs.memora.auth.dto.AuthResponse;
import fcs.memora.auth.dto.LoginRequest;
import fcs.memora.auth.dto.RegisterRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;

import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordService passwordService;

    @Mock
    private JwtService jwtService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AuthService authService;

    @Test
    void shouldRegisterNewUser() {
        RegisterRequest request = new RegisterRequest("new@example.com", "New User", "password123");
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordService.hashPassword("password123")).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User registered = authService.register(request);

        assertThat(registered.getEmail()).isEqualTo("new@example.com");
        assertThat(registered.getName()).isEqualTo("New User");
        assertThat(registered.getRole()).isEqualTo(UserRole.USER);
        assertThat(registered.getUserStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void shouldRejectDuplicateEmailOnRegister() {
        RegisterRequest request = new RegisterRequest("existing@example.com", "User", "password123");
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldLoginAndReturnAccessToken() {
        LoginRequest request = new LoginRequest("user@example.com", "password123");
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("user@example.com")
            .name("User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        RefreshToken refreshToken = RefreshToken.builder()
            .token("refreshTokenValue")
            .user(user)
            .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordService.matchesPassword("password123", "hashedPassword")).thenReturn(true);
        when(refreshTokenService.createRefreshToken(user)).thenReturn(refreshToken);
        when(jwtService.generateAccessToken(user)).thenReturn("accessTokenValue");

        HttpServletResponse response = mock(HttpServletResponse.class);
        AuthResponse authResponse = authService.login(request, response);

        assertThat(authResponse.accessToken()).isEqualTo("accessTokenValue");
        ArgumentCaptor<Cookie> cookieCaptor = ArgumentCaptor.forClass(Cookie.class);
        verify(response).addCookie(cookieCaptor.capture());
        assertThat(cookieCaptor.getValue().getName()).isEqualTo("refreshToken");
        assertThat(cookieCaptor.getValue().getValue()).isEqualTo("refreshTokenValue");
        assertThat(cookieCaptor.getValue().isHttpOnly()).isTrue();
    }

    @Test
    void shouldRejectInvalidCredentials() {
        LoginRequest request = new LoginRequest("user@example.com", "wrongPassword");
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("user@example.com")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(passwordService.matchesPassword("wrongPassword", "hashedPassword")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request, mock(HttpServletResponse.class)))
            .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void shouldRejectBlockedUser() {
        LoginRequest request = new LoginRequest("blocked@example.com", "password123");
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("blocked@example.com")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.BLOCKED)
            .lastNotePosition(0L)
            .build();

        when(userRepository.findByEmail("blocked@example.com")).thenReturn(Optional.of(user));
        when(passwordService.matchesPassword("password123", "hashedPassword")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request, mock(HttpServletResponse.class)))
            .isInstanceOf(DisabledException.class);
    }

    @Test
    void shouldRefreshAccessToken() {
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("user@example.com")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        RefreshToken oldToken = RefreshToken.builder().token("oldToken").user(user).revoked(false).build();
        RefreshToken newToken = RefreshToken.builder().token("newToken").user(user).revoked(false).build();

        when(refreshTokenService.findByToken("oldToken")).thenReturn(Optional.of(oldToken));
        when(refreshTokenService.isExpired(oldToken)).thenReturn(false);
        when(refreshTokenService.createRefreshToken(user)).thenReturn(newToken);
        when(jwtService.generateAccessToken(user)).thenReturn("newAccessToken");

        HttpServletResponse response = mock(HttpServletResponse.class);
        AuthResponse authResponse = authService.refresh("oldToken", response);

        assertThat(authResponse.accessToken()).isEqualTo("newAccessToken");
        verify(refreshTokenService).revokeAllByUser(user);
    }

    @Test
    void shouldLogoutAndClearCookie() {
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("user@example.com")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        RefreshToken token = RefreshToken.builder().token("token").user(user).build();

        when(refreshTokenService.findByToken("token")).thenReturn(Optional.of(token));

        HttpServletResponse response = mock(HttpServletResponse.class);
        authService.logout("token", response);

        verify(refreshTokenService).revokeAllByUser(user);
        ArgumentCaptor<Cookie> cookieCaptor = ArgumentCaptor.forClass(Cookie.class);
        verify(response).addCookie(cookieCaptor.capture());
        assertThat(cookieCaptor.getValue().getMaxAge()).isEqualTo(0);
    }

    @Test
    void shouldLogoutWithoutToken() {
        HttpServletResponse response = mock(HttpServletResponse.class);
        authService.logout(null, response);

        verify(refreshTokenService, never()).revokeAllByUser(any());
    }
}
