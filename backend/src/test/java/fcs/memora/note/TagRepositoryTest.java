package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
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
        User user = userRepository.save(user("taguser1234567890123456789012345", "tag@example.com"));

        tagRepository.save(Tag.builder().user(user).tagName("work").build());

        assertThat(tagRepository.existsByUserAndTagNameIgnoreCase(user, "WORK")).isTrue();
        assertThat(tagRepository.existsByUserAndTagNameIgnoreCase(user, "personal")).isFalse();
        assertThat(tagRepository.findByUserOrderByTagNameAsc(user)).hasSize(1);
    }

    @Test
    void shouldEnforceUniqueTagNamePerOwner() {
        User user = userRepository.save(user("owner1uuid1234567890123456789012", "owner1@example.com"));
        tagRepository.saveAndFlush(Tag.builder().user(user).tagName("work").build());

        assertThatThrownBy(() ->
            tagRepository.saveAndFlush(Tag.builder().user(user).tagName("work").build()))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowSameTagNameForDifferentOwners() {
        User first = userRepository.save(user("owner1uuid1234567890123456789012", "owner1@example.com"));
        User second = userRepository.save(user("owner2uuid1234567890123456789012", "owner2@example.com"));

        tagRepository.saveAndFlush(Tag.builder().user(first).tagName("work").build());
        tagRepository.saveAndFlush(Tag.builder().user(second).tagName("work").build());

        assertThat(tagRepository.findByTagName("work")).hasSize(2);
    }

    @Test
    void shouldFindByUserAndTagNameAndAcrossOwners() {
        User owner = userRepository.save(user("owner1uuid1234567890123456789012", "owner1@example.com"));
        User other = userRepository.save(user("owner2uuid1234567890123456789012", "owner2@example.com"));
        tagRepository.save(Tag.builder().user(owner).tagName("work").build());
        tagRepository.save(Tag.builder().user(other).tagName("work").build());

        assertThat(tagRepository.findByUserAndTagName(owner, "work")).isPresent();
        assertThat(tagRepository.findByUserAndTagName(owner, "missing")).isEmpty();
        assertThat(tagRepository.findByTagNameAndUserNot("work", owner)).hasSize(1);
    }

    private User user(String uuid, String email) {
        return User.builder()
            .uuidUser(uuid)
            .email(email)
            .name("Tag User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
    }
}
