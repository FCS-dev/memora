package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class TagRepositoryTest {

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldSaveAndFindTagByUserAndName() {
        User user = userRepository.save(User.builder()
            .uuidUser("taguser1234567890123456789012345")
            .email("tag@example.com")
            .name("Tag User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());

        tagRepository.save(Tag.builder().user(user).tagName("work").build());

        assertThat(tagRepository.existsByUserAndTagNameIgnoreCase(user, "WORK")).isTrue();
        assertThat(tagRepository.existsByUserAndTagNameIgnoreCase(user, "personal")).isFalse();
        assertThat(tagRepository.findByUserOrderByTagNameAsc(user)).hasSize(1);
    }
}
