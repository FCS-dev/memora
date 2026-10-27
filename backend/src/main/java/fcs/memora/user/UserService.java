package fcs.memora.user;

import fcs.memora.ai.AiConsentService;
import fcs.memora.ai.AiProperties;
import fcs.memora.auth.PasswordService;
import fcs.memora.auth.RefreshTokenService;
import fcs.memora.user.dto.ChangePasswordRequest;
import fcs.memora.user.dto.UpdateProfileRequest;
import fcs.memora.user.dto.UserProfileResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordService passwordService;
    private final RefreshTokenService refreshTokenService;
    private final AiConsentService aiConsentService;
    private final AiProperties aiProperties;

    public UserService(UserRepository userRepository, PasswordService passwordService,
                       RefreshTokenService refreshTokenService, AiConsentService aiConsentService,
                       AiProperties aiProperties) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.refreshTokenService = refreshTokenService;
        this.aiConsentService = aiConsentService;
        this.aiProperties = aiProperties;
    }

    public UserProfileResponse getProfile(String uuidUser) {
        User user = findActiveUser(uuidUser);
        return toResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(String uuidUser, UpdateProfileRequest request) {
        User user = findActiveUser(uuidUser);
        user.setName(request.name().trim());
        user.setAvatarColor(request.avatarColor());
        userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public void changePassword(String uuidUser, ChangePasswordRequest request) {
        User user = findActiveUser(uuidUser);
        if (!passwordService.matchesPassword(request.currentPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Contraseña actual incorrecta");
        }
        user.setPasswordHash(passwordService.hashPassword(request.newPassword()));
        userRepository.save(user);
        refreshTokenService.revokeAllByUser(user);
    }

    private User findActiveUser(String uuidUser) {
        User user = userRepository.findByUuidUser(uuidUser)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }
        return user;
    }

    private UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
            user.getUuidUser(),
            user.getEmail(),
            user.getName(),
            user.getRole().name(),
            user.getAvatarColor(),
            aiProperties.enabled(),
            aiConsentService.state(user).name(),
            aiConsentService.requiresConsent(user),
            aiProperties.noticeVersion()
        );
    }
}
