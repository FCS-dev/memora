package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import fcs.memora.admin.TagOwnerResolver;
import fcs.memora.note.dto.ChangeNoteGroupRequest;
import fcs.memora.note.dto.ChecklistItem;
import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.NoteResponse;
import fcs.memora.note.dto.ReorderNoteRequest;
import fcs.memora.note.dto.UpdateNoteRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    private static final String NOTE_UUID = "11111111-1111-1111-1111-111111111111";
    private static final String BEFORE_UUID = "22222222-2222-2222-2222-222222222222";
    private static final String AFTER_UUID = "33333333-3333-3333-3333-333333333333";

    private static long idSequence = 0L;

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TagOwnerResolver tagOwnerResolver;

    @InjectMocks
    private NoteService noteService;

    @Test
    void shouldResolveOwnAndGlobalTagsOnCreate() {
        User user = user();
        User admin = User.builder()
            .id(2L)
            .uuidUser("admin-uuid")
            .email("admin@example.com")
            .name("Admin")
            .passwordHash("hashedPassword")
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .build();
        Tag ownTag = Tag.builder().id(1L).user(user).tagName("personal").build();
        Tag globalTag = Tag.builder().id(9L).user(admin).tagName("work").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.of(admin));
        when(tagRepository.findAllById(any())).thenReturn(List.of(ownTag, globalTag));
        when(noteRepository.maxPosition(user, false, false)).thenReturn(Optional.empty());
        when(noteRepository.existsByUuidNote(any())).thenReturn(false);
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.create("uuid",
            new CreateNoteRequest("Title", "Content", false, null, null, false, false, Set.of(1L, 9L)));

        assertThat(response.tags()).containsExactlyInAnyOrder("personal", "work");
    }

    @Test
    void shouldRejectTagFromAnotherUser() {
        User user = user();
        User other = User.builder()
            .id(3L)
            .uuidUser("other-uuid")
            .email("other@example.com")
            .name("Other")
            .passwordHash("hashedPassword")
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
        Tag foreign = Tag.builder().id(5L).user(other).tagName("secret").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.empty());
        when(tagRepository.findAllById(any())).thenReturn(List.of(foreign));

        assertThatThrownBy(() -> noteService.create("uuid",
            new CreateNoteRequest("Title", "Content", false, null, null, false, false, Set.of(5L))))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldCreateNotPinnedNoteAtTop() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.maxPosition(user, false, false)).thenReturn(Optional.of(200_000L));
        when(noteRepository.existsByUuidNote(any())).thenReturn(false);
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.create("uuid",
            new CreateNoteRequest("Title", "Content", false, null, null, false, false, null));

        assertThat(response.uuidNote()).isNotBlank();
        assertThat(response.isPinned()).isFalse();
        assertThat(response.isArchived()).isFalse();

        ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
        verify(noteRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getPosition()).isEqualTo(300_000L);
    }

    @Test
    void shouldCreatePinnedNoteAtTopOfPinnedGroup() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.maxPosition(user, true, false)).thenReturn(Optional.empty());
        when(noteRepository.existsByUuidNote(any())).thenReturn(false);
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.create("uuid",
            new CreateNoteRequest("Title", "Content", false, null, null, true, false, null));

        assertThat(response.isPinned()).isTrue();
    }

    @Test
    void shouldRejectArchivedCreation() {
        assertThatThrownBy(() -> noteService.create("uuid",
            new CreateNoteRequest("Title", "Content", false, null, null, false, true, null)))
            .isInstanceOf(IllegalArgumentException.class);
        verify(noteRepository, never()).save(any(Note.class));
    }

    @Test
    void shouldRetryUuidUntilUnique() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.maxPosition(user, false, false)).thenReturn(Optional.of(100_000L));
        when(noteRepository.existsByUuidNote(any())).thenReturn(true, true, false);
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        noteService.create("uuid", new CreateNoteRequest("Title", "Content", false, null, null, false, false, null));

        verify(noteRepository, times(3)).existsByUuidNote(any());
    }

    @Test
    void shouldListActiveNotes() {
        User user = user();
        Note pinned = note(user, NOTE_UUID, 100_000L, true, false);
        Note plain = note(user, AFTER_UUID, 200_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUserAndIsArchivedFalseOrderByIsPinnedDescPositionDescIdDesc(user))
            .thenReturn(List.of(pinned, plain));

        List<NoteResponse> result = noteService.list("uuid");

        assertThat(result).extracting(NoteResponse::uuidNote).containsExactly(NOTE_UUID, AFTER_UUID);
    }

    @Test
    void shouldListArchivedNotes() {
        User user = user();
        Note archived = note(user, NOTE_UUID, 100_000L, false, true);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUserAndIsArchivedTrueOrderByCreatedAtDescIdDesc(user))
            .thenReturn(List.of(archived));

        assertThat(noteService.listArchived("uuid")).hasSize(1);
    }

    @Test
    void shouldUpdateContentWithoutChangingPositionWhenPinNotSent() {
        User user = user();
        Note note = note(user, NOTE_UUID, 100_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.update("uuid", NOTE_UUID,
            new UpdateNoteRequest("New", "New content", false, null, null, null, null));

        assertThat(response.title()).isEqualTo("New");
        assertThat(note.getPosition()).isEqualTo(100_000L);
        verify(noteRepository, never()).maxPosition(any(), anyBoolean(), anyBoolean());
    }

    @Test
    void shouldMoveNoteToTopWhenPinChanges() {
        User user = user();
        Note note = note(user, NOTE_UUID, 100_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.maxPosition(user, true, false)).thenReturn(Optional.of(500_000L));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.update("uuid", NOTE_UUID,
            new UpdateNoteRequest("New", "c", false, null, null, true, null));

        assertThat(response.isPinned()).isTrue();
        assertThat(note.getPosition()).isEqualTo(600_000L);
    }

    @Test
    void shouldUnarchiveWhenPinnedStateSent() {
        User user = user();
        Note note = note(user, NOTE_UUID, 300_000L, false, true);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.maxPosition(user, false, false)).thenReturn(Optional.of(400_000L));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.update("uuid", NOTE_UUID,
            new UpdateNoteRequest("New", "c", false, null, null, false, null));

        assertThat(response.isArchived()).isFalse();
        assertThat(note.getPosition()).isEqualTo(500_000L);
    }

    @Test
    void shouldRejectMalformedUuid() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> noteService.getByUuid("uuid", "not-a-uuid"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldReturnNotFoundForMissingNote() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> noteService.getByUuid("uuid", NOTE_UUID))
            .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void shouldReorderNoteToTop() {
        User user = user();
        Note note = note(user, NOTE_UUID, 200_000L, false, false);
        Note top = note(user, AFTER_UUID, 500_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.findByUuidNoteAndUser(AFTER_UUID, user)).thenReturn(Optional.of(top));
        when(noteRepository.findByUserAndIsPinnedAndIsArchivedOrderByPositionDescIdDesc(user, false, false))
            .thenReturn(new java.util.ArrayList<>(List.of(top, note)));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        noteService.reorder("uuid", NOTE_UUID, new ReorderNoteRequest(null, AFTER_UUID));

        assertThat(note.getPosition()).isEqualTo(600_000L);
    }

    @Test
    void shouldRebalanceWhenNoGap() {
        User user = user();
        Note note = note(user, NOTE_UUID, 300_000L, false, false);
        Note before = note(user, BEFORE_UUID, 501L, false, false);
        Note after = note(user, AFTER_UUID, 500L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.findByUuidNoteAndUser(BEFORE_UUID, user)).thenReturn(Optional.of(before));
        when(noteRepository.findByUuidNoteAndUser(AFTER_UUID, user)).thenReturn(Optional.of(after));
        when(noteRepository.findByUserAndIsPinnedAndIsArchivedOrderByPositionDescIdDesc(user, false, false))
            .thenReturn(new java.util.ArrayList<>(List.of(before, after, note)));
        when(noteRepository.saveAllAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        noteService.reorder("uuid", NOTE_UUID, new ReorderNoteRequest(BEFORE_UUID, AFTER_UUID));

        assertThat(before.getPosition()).isEqualTo(200_000L);
        assertThat(after.getPosition()).isEqualTo(100_000L);
        assertThat(note.getPosition()).isEqualTo(150_000L);
    }

    @Test
    void shouldRejectReorderOfArchivedNote() {
        User user = user();
        Note note = note(user, NOTE_UUID, 100_000L, false, true);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> noteService.reorder("uuid", NOTE_UUID, new ReorderNoteRequest(null, null)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectNeighborFromAnotherGroup() {
        User user = user();
        Note note = note(user, NOTE_UUID, 100_000L, false, false);
        Note pinned = note(user, BEFORE_UUID, 100_000L, true, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.findByUuidNoteAndUser(BEFORE_UUID, user)).thenReturn(Optional.of(pinned));

        assertThatThrownBy(() -> noteService.reorder("uuid", NOTE_UUID, new ReorderNoteRequest(BEFORE_UUID, null)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldRejectSelfAsNeighbor() {
        User user = user();
        Note note = note(user, NOTE_UUID, 100_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> noteService.reorder("uuid", NOTE_UUID, new ReorderNoteRequest(NOTE_UUID, null)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldChangeGroupToArchivedKeepingPosition() {
        User user = user();
        Note note = note(user, NOTE_UUID, 300_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.changeGroup("uuid", NOTE_UUID,
            new ChangeNoteGroupRequest(NoteGroup.ARCHIVED));

        assertThat(response.isArchived()).isTrue();
        assertThat(response.isPinned()).isFalse();
        assertThat(note.getPosition()).isEqualTo(300_000L);
    }

    @Test
    void shouldChangeGroupToPinnedAtTop() {
        User user = user();
        Note note = note(user, NOTE_UUID, 300_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.maxPosition(user, true, false)).thenReturn(Optional.of(400_000L));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.changeGroup("uuid", NOTE_UUID,
            new ChangeNoteGroupRequest(NoteGroup.PINNED));

        assertThat(response.isPinned()).isTrue();
        assertThat(note.getPosition()).isEqualTo(500_000L);
    }

    @Test
    void shouldRejectChangeToSameGroup() {
        User user = user();
        Note note = note(user, NOTE_UUID, 300_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> noteService.changeGroup("uuid", NOTE_UUID,
            new ChangeNoteGroupRequest(NoteGroup.NOT_PINNED)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldMarkChecklistItemWithoutTouchingOthers() {
        User user = user();
        Note note = checklistNote(user, "[{\"text\":\"task1\",\"checked\":false},{\"text\":\"task2\",\"checked\":true}]");
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));
        when(noteRepository.saveAndFlush(any(Note.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NoteResponse response = noteService.updateChecklistItem("uuid", NOTE_UUID, "task1", true);

        assertThat(response.checklistItems())
            .containsExactly(new ChecklistItem("task1", true), new ChecklistItem("task2", true));
        assertThat(note.getContentJson()).contains("\"text\":\"task1\"").contains("\"checked\":true");
    }

    @Test
    void shouldRejectUnknownChecklistItem() {
        User user = user();
        Note note = checklistNote(user, "[{\"text\":\"task1\",\"checked\":false}]");
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> noteService.updateChecklistItem("uuid", NOTE_UUID, "missing", true))
            .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void shouldRejectChecklistItemOnNonChecklistNote() {
        User user = user();
        Note note = note(user, NOTE_UUID, 300_000L, false, false);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(noteRepository.findByUuidNoteAndUser(NOTE_UUID, user)).thenReturn(Optional.of(note));

        assertThatThrownBy(() -> noteService.updateChecklistItem("uuid", NOTE_UUID, "task1", true))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private Note checklistNote(User user, String contentJson) {
        return Note.builder()
            .id(++idSequence)
            .uuidNote(NOTE_UUID)
            .user(user)
            .title("Checklist")
            .content("")
            .contentJson(contentJson)
            .checklistMode(true)
            .position(100_000L)
            .build();
    }

    private Note note(User user, String uuid, long position, boolean isPinned, boolean isArchived) {
        return Note.builder()
            .id(++idSequence)
            .uuidNote(uuid)
            .user(user)
            .title("Title")
            .content("Content")
            .position(position)
            .isPinned(isPinned)
            .isArchived(isArchived)
            .build();
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
            .build();
    }
}
