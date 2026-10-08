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

import java.util.Set;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class NoteRepositoryTest {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldSaveNoteWithTags() {
        User user = userRepository.save(User.builder()
            .uuidUser("noteuser123456789012345678901234")
            .email("note@example.com")
            .name("Note User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build());

        Tag tag = tagRepository.save(Tag.builder()
            .user(user)
            .tagName("important")
            .build());

        Note note = Note.builder()
            .user(user)
            .title("My Note")
            .content("Note content")
            .position(100000L)
            .tags(Set.of(tag))
            .build();

        Note saved = noteRepository.save(note);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getTags()).hasSize(1);
        assertThat(saved.getTags().iterator().next().getTagName()).isEqualTo("important");

        Note found = noteRepository.findByIdAndUser(saved.getId(), user).orElseThrow();
        assertThat(found.getTitle()).isEqualTo("My Note");
    }

    @Test
    void shouldFindNotesByUserOrderedByPosition() {
        User user = userRepository.save(User.builder()
            .uuidUser("noteuser2123456789012345678901234")
            .email("note2@example.com")
            .name("Note User 2")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build());

        noteRepository.save(Note.builder().user(user).title("Second").content("c").position(200000L).build());
        noteRepository.save(Note.builder().user(user).title("First").content("c").position(300000L).build());

        assertThat(noteRepository.findByUserOrderByPositionDesc(user)).hasSize(2);
        assertThat(noteRepository.findByUserOrderByPositionDesc(user).get(0).getTitle()).isEqualTo("First");
    }
}
