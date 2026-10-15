package fcs.memora.admin;

import fcs.memora.auth.RefreshTokenService;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserStatus;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;
    private final TagOwnerResolver tagOwnerResolver;

    public AdminService(UserRepository userRepository, RefreshTokenService refreshTokenService,
                        TagOwnerResolver tagOwnerResolver) {
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
        this.tagOwnerResolver = tagOwnerResolver;
    }

    @Transactional
    public User updateStatus(String adminUuid, String targetUuid, UpdateStatusRequest request) {
        if (adminUuid.equals(targetUuid)) {
            throw new IllegalArgumentException("No puede modificar su propio estado");
        }

        User user = userRepository.findByUuidUser(targetUuid)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        boolean isCatalogOwner = tagOwnerResolver.catalogOwner()
            .map(owner -> owner.getId().equals(user.getId()))
            .orElse(false);
        if (isCatalogOwner) {
            throw new IllegalArgumentException("No se puede modificar el estado de la cuenta administradora del catálogo");
        }

        UserStatus newStatus = request.status();
        user.setUserStatus(newStatus);
        User saved = userRepository.save(user);

        if (newStatus == UserStatus.BLOCKED || newStatus == UserStatus.DISABLED) {
            refreshTokenService.revokeAllByUser(saved);
        }

        return saved;
    }
}
