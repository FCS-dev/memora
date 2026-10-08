package fcs.memora.user;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldSaveAndRetrieveUser() {
        User user = User.builder()
            .uuidUser("12345678901234567890123456789012")
            .email("test@example.com")
            .name("Test User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        User saved = userRepository.save(user);
        Optional<User> found = userRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getUuidUser()).isEqualTo("12345678901234567890123456789012");
        assertThat(found.get().getEmail()).isEqualTo("test@example.com");
        assertThat(found.get().getName()).isEqualTo("Test User");
        assertThat(found.get().getRole()).isEqualTo(UserRole.USER);
        assertThat(found.get().getUserStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(found.get().getLastNotePosition()).isEqualTo(0L);
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFindByEmail() {
        User user = User.builder()
            .uuidUser("12345678901234567890123456789012")
            .email("find@example.com")
            .name("Find User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        userRepository.save(user);
        Optional<User> found = userRepository.findByEmail("find@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("find@example.com");
    }

    @Test
    void shouldFindByUuidUser() {
        User user = User.builder()
            .uuidUser("abcdefabcdefabcdefabcdefabcdefab")
            .email("uuid@example.com")
            .name("Uuid User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        userRepository.save(user);
        Optional<User> found = userRepository.findByUuidUser("abcdefabcdefabcdefabcdefabcdefab");

        assertThat(found).isPresent();
        assertThat(found.get().getUuidUser()).isEqualTo("abcdefabcdefabcdefabcdefabcdefab");
    }

    @Test
    void shouldCheckEmailExists() {
        User user = User.builder()
            .uuidUser("12345678901234567890123456789012")
            .email("exists@example.com")
            .name("Exists User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        userRepository.save(user);

        assertThat(userRepository.existsByEmail("exists@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("missing@example.com")).isFalse();
    }

    @Test
    void shouldCountByRole() {
        User admin = User.builder()
            .uuidUser("adminadminadminadminadminadminad")
            .email("admin@example.com")
            .name("Admin")
            .passwordHash("hashedPassword")
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        User regular = User.builder()
            .uuidUser("useruseruseruseruseruseruseruser")
            .email("user@example.com")
            .name("User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();

        userRepository.save(admin);
        userRepository.save(regular);

        assertThat(userRepository.countByRole(UserRole.ADMIN)).isEqualTo(1L);
        assertThat(userRepository.countByRole(UserRole.USER)).isEqualTo(1L);
    }
}
