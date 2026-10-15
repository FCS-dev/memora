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

import java.util.List;
import java.util.Set;
import java.util.UUID;

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
        User user = userRepository.save(user("noteuser123456789012345678901234", "note@example.com"));

        Tag tag = tagRepository.save(Tag.builder()
            .user(user)
            .tagName("important")
            .build());

        Note note = note(user, "My Note", 100000L, false, false);
        note.setTags(Set.of(tag));

        Note saved = noteRepository.save(note);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getUuidNote()).isNotBlank();
        assertThat(saved.getTags()).hasSize(1);
        assertThat(saved.getTags().iterator().next().getTagName()).isEqualTo("important");

        Note found = noteRepository.findByUuidNoteAndUser(saved.getUuidNote(), user).orElseThrow();
        assertThat(found.getTitle()).isEqualTo("My Note");
    }

    @Test
    void shouldFindActiveNotesPinnedFirstThenPositionDesc() {
        User user = userRepository.save(user("noteuser2123456789012345678901234", "note2@example.com"));

        noteRepository.save(note(user, "NotPinnedHigh", 300000L, false, false));
        noteRepository.save(note(user, "NotPinnedLow", 200000L, false, false));
        noteRepository.save(note(user, "Pinned", 100000L, true, false));
        noteRepository.save(note(user, "Archived", 900000L, false, true));

        List<Note> result = noteRepository.findByUserAndIsArchivedFalseOrderByIsPinnedDescPositionDescIdDesc(user);

        assertThat(result).extracting(Note::getTitle)
            .containsExactly("Pinned", "NotPinnedHigh", "NotPinnedLow");
    }

    @Test
    void shouldFindArchivedNotesByCreatedAtDesc() {
        User user = userRepository.save(user("noteuser3123456789012345678901234", "note3@example.com"));

        Note first = noteRepository.save(note(user, "First", 100000L, false, true));
        Note second = noteRepository.save(note(user, "Second", 100000L, false, true));

        List<Note> result = noteRepository.findByUserAndIsArchivedTrueOrderByCreatedAtDescIdDesc(user);

        assertThat(result).extracting(Note::getId).containsExactly(second.getId(), first.getId());
    }

    @Test
    void shouldFindMaxPositionOfGroup() {
        User user = userRepository.save(user("noteuser4123456789012345678901234", "note4@example.com"));

        noteRepository.save(note(user, "A", 200000L, false, false));
        noteRepository.save(note(user, "B", 500000L, false, false));

        assertThat(noteRepository.maxPosition(user, false, false)).contains(500000L);
        assertThat(noteRepository.maxPosition(user, true, false)).isEmpty();
    }

    @Test
    void shouldNotFindNoteOfAnotherUser() {
        User owner = userRepository.save(user("noteuser5123456789012345678901234", "note5@example.com"));
        User other = userRepository.save(user("noteuser6123456789012345678901234", "note6@example.com"));
        Note saved = noteRepository.save(note(owner, "Private", 100000L, false, false));

        assertThat(noteRepository.findByUuidNoteAndUser(saved.getUuidNote(), other)).isEmpty();
    }

    @Test
    void shouldCountDistinctNotesPerTagIncludingArchived() {
        User user = userRepository.save(user("noteuser7123456789012345678901234", "note7@example.com"));
        Tag tag = tagRepository.save(Tag.builder().user(user).tagName("work").build());

        Note active = note(user, "Active", 100000L, false, false);
        active.setTags(Set.of(tag));
        noteRepository.save(active);

        Note archived = note(user, "Archived", 200000L, false, true);
        archived.setTags(Set.of(tag));
        noteRepository.save(archived);

        noteRepository.save(note(user, "NoTag", 300000L, false, false));

        List<TagUsageCount> counts = noteRepository.countNotesByTagIds(List.of(tag.getId()));

        assertThat(counts).hasSize(1);
        assertThat(counts.get(0).tagId()).isEqualTo(tag.getId());
        assertThat(counts.get(0).total()).isEqualTo(2L);
    }

    private Note note(User user, String title, long position, boolean isPinned, boolean isArchived) {
        return Note.builder()
            .uuidNote(UUID.randomUUID().toString())
            .user(user)
            .title(title)
            .content("content")
            .position(position)
            .isPinned(isPinned)
            .isArchived(isArchived)
            .build();
    }

    private User user(String uuidUser, String email) {
        return User.builder()
            .uuidUser(uuidUser)
            .email(email)
            .name("Note User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
    }
}
