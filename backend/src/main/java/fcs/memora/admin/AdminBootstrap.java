package fcs.memora.admin;

import fcs.memora.auth.PasswordService;
import fcs.memora.user.AvatarColor;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import fcs.memora.util.TextNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@Profile("!test")
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final String adminEmail;
    private final String adminPassword;
    private final UserRepository userRepository;
    private final PasswordService passwordService;

    public AdminBootstrap(
        @Value("${ADMIN_EMAIL:}") String adminEmail,
        @Value("${ADMIN_PASSWORD:}") String adminPassword,
        UserRepository userRepository,
        PasswordService passwordService) {
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.userRepository = userRepository;
        this.passwordService = passwordService;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Base de datos con usuarios existentes; se omite la creación del administrador inicial.");
            return;
        }

        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            throw new IllegalStateException(
                "Se requieren las variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD para crear el usuario administrador inicial.");
        }

        User admin = User.builder()
            .uuidUser(UUID.randomUUID().toString())
            .email(TextNormalizer.normalizeEmail(adminEmail))
            .name("Administrador")
            .passwordHash(passwordService.hashPassword(adminPassword))
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .avatarColor(AvatarColor.randomHex())
            .build();

        userRepository.save(admin);
        log.info("Usuario administrador inicial creado.");
    }
}
