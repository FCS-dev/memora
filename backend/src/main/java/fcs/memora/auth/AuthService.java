package fcs.memora.auth;

import fcs.memora.auth.dto.AuthResponse;
import fcs.memora.auth.dto.LoginRequest;
import fcs.memora.auth.dto.RegisterRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import fcs.memora.util.TextNormalizer;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final long COOKIE_MAX_AGE_SECONDS = 60L * 60L * 24L * 30L; // 30 días

    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(UserRepository userRepository, PasswordService passwordService,
                       JwtService jwtService, RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public User register(RegisterRequest request) {
        String normalizedEmail = TextNormalizer.normalizeEmail(request.email());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("El correo electrónico ya está registrado");
        }

        User user = User.builder()
            .uuidUser(UUID.randomUUID().toString())
            .email(normalizedEmail)
            .name(request.name().trim())
            .passwordHash(passwordService.hashPassword(request.password()))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        return userRepository.save(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        String normalizedEmail = TextNormalizer.normalizeEmail(request.email());
        User user = userRepository.findByEmail(normalizedEmail)
            .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        if (!passwordService.matchesPassword(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Credenciales inválidas");
        }

        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }

        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);
        setRefreshTokenCookie(response, refreshToken.getToken());

        return new AuthResponse(jwtService.generateAccessToken(user));
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenValue, HttpServletResponse response) {
        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            throw new BadCredentialsException("Refresh token requerido");
        }

        RefreshToken refreshToken = refreshTokenService.findByToken(refreshTokenValue)
            .orElseThrow(() -> new BadCredentialsException("Refresh token inválido"));

        if (refreshToken.isRevoked() || refreshTokenService.isExpired(refreshToken)) {
            throw new BadCredentialsException("Refresh token inválido");
        }

        User user = refreshToken.getUser();
        refreshTokenService.revokeAllByUser(user);
        RefreshToken newToken = refreshTokenService.createRefreshToken(user);
        setRefreshTokenCookie(response, newToken.getToken());

        return new AuthResponse(jwtService.generateAccessToken(user));
    }

    @Transactional
    public void logout(String refreshTokenValue, HttpServletResponse response) {
        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            refreshTokenService.findByToken(refreshTokenValue).ifPresent(token -> {
                refreshTokenService.revokeAllByUser(token.getUser());
            });
        }
        clearRefreshTokenCookie(response);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) COOKIE_MAX_AGE_SECONDS);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, null);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
