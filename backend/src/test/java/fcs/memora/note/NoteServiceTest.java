package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.NoteResponse;
import fcs.memora.note.dto.UpdateNoteRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NoteService noteService;

    @Test
    void shouldCreateNoteWithPositionIncrement() {
        User user = user();
        user.setLastNotePosition(200_000L);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(noteRepository.save(any(Note.class))).thenAnswer(invocation -> {
            Note note = invocation.getArgument(0);
            note.setId(1L);
            return note;
        });

        CreateNoteRequest request = new CreateNoteRequest(
            "Title", "Content", false, null, null, false, false, null);

        NoteResponse response = noteService.create("uuid", request);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.position()).isEqualTo(300_000L);
        assertThat(user.getLastNotePosition()).isEqualTo(300_000L);
    }

    @Test
    void shouldCreateChecklistNote() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        when(noteRepository.save(any(Note.class))).thenAnswer(invocation -> {
            Note note = invocation.getArgument(0);
            note.setId(1L);
            return note;
        });

        CreateNoteRequest request = new CreateNoteRequest(
            "Checklist", "ignored", true, java.util.Map.of("task1", false, "task2", true), null, false, false, null);

        NoteResponse response = noteService.create("uuid", request);

        assertThat(response.checklistMode()).isTrue();
        assertThat(response.content()).isEmpty();
        assertThat(response.checklistItems()).containsEntry("task1", false).containsEntry("task2", true);
    }

    @Test
    void shouldUpdateNote() {
        User user = user();
        Note note = Note.builder()
            .id(1L)
            .user(user)
            .title("Old")
            .content("Old content")
            .checklistMode(false)
            .position(100_000L)
            .build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByIdAndUser(1L, user)).thenReturn(Optional.of(note));
        when(noteRepository.save(any(Note.class))).thenReturn(note);

        UpdateNoteRequest request = new UpdateNoteRequest(
            "New", "New content", false, null, LocalDateTime.now(), true, false, null);

        NoteResponse response = noteService.update("uuid", 1L, request);

        assertThat(response.title()).isEqualTo("New");
        assertThat(response.isPinned()).isTrue();
    }

    @Test
    void shouldDeleteNote() {
        User user = user();
        Note note = Note.builder().id(1L).user(user).title("Note").content("c").position(100_000L).build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByIdAndUser(1L, user)).thenReturn(Optional.of(note));

        noteService.delete("uuid", 1L);
    }

    private User user() {
        return User.builder()
            .id(1L)
            .uuidUser("uuid")
            .email("user@example.com")
            .name("User")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
    }
}
