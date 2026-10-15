package fcs.memora.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import fcs.memora.admin.dto.GlobalTagResponse;
import fcs.memora.admin.dto.RenameGlobalTagRequest;
import fcs.memora.note.Note;
import fcs.memora.note.NoteRepository;
import fcs.memora.note.Tag;
import fcs.memora.note.TagRepository;
import fcs.memora.note.TagUsageCount;
import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.exception.DuplicateTagException;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@ExtendWith(MockitoExtension.class)
class AdminTagServiceTest {

    @Mock
    private TagRepository tagRepository;

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminTagService adminTagService;

    @Test
    void shouldCreateGlobalTagNormalized() {
        User admin = admin();
        when(userRepository.findByUuidUser("admin-uuid")).thenReturn(Optional.of(admin));
        when(tagRepository.existsByUserAndTagNameIgnoreCase(admin, "work")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> {
            Tag tag = invocation.getArgument(0);
            tag.setId(10L);
            return tag;
        });
        when(tagRepository.findByTagNameAndUserNot("work", admin)).thenReturn(List.of());
        when(noteRepository.countNotesByTagIds(List.of(10L))).thenReturn(List.of());

        GlobalTagResponse response = adminTagService.create("admin-uuid", new CreateTagRequest("  WORK  "));

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.tagName()).isEqualTo("work");
        assertThat(response.noteCount()).isZero();
    }

    @Test
    void shouldRejectDuplicateGlobalTag() {
        User admin = admin();
        when(userRepository.findByUuidUser("admin-uuid")).thenReturn(Optional.of(admin));
        when(tagRepository.existsByUserAndTagNameIgnoreCase(admin, "work")).thenReturn(true);

        assertThatThrownBy(() -> adminTagService.create("admin-uuid", new CreateTagRequest("work")))
            .isInstanceOf(DuplicateTagException.class);
    }

    @Test
    void shouldListGlobalTagsWithCounts() {
        User admin = admin();
        Tag alpha = Tag.builder().id(1L).user(admin).tagName("alpha").build();
        Tag beta = Tag.builder().id(2L).user(admin).tagName("beta").build();
        when(userRepository.findByUuidUser("admin-uuid")).thenReturn(Optional.of(admin));
        when(tagRepository.findByUserOrderByTagNameAsc(admin)).thenReturn(List.of(alpha, beta));
        when(noteRepository.countNotesByTagIds(List.of(1L, 2L)))
            .thenReturn(List.of(new TagUsageCount(2L, 3L)));

        List<GlobalTagResponse> result = adminTagService.list("admin-uuid");

        assertThat(result).extracting(GlobalTagResponse::tagName).containsExactly("alpha", "beta");
        assertThat(result.get(0).noteCount()).isZero();
        assertThat(result.get(1).noteCount()).isEqualTo(3L);
    }

    @Test
    void shouldReturnEmptyListWhenNoGlobals() {
        User admin = admin();
        when(userRepository.findByUuidUser("admin-uuid")).thenReturn(Optional.of(admin));
        when(tagRepository.findByUserOrderByTagNameAsc(admin)).thenReturn(List.of());

        assertThat(adminTagService.list("admin-uuid")).isEmpty();
    }

    @Test
    void shouldRenameGlobalTag() {
        User admin = admin();
        Tag global = Tag.builder().id(10L).user(admin).tagName("work").build();
        when(userRepository.findByUuidUser("admin-uuid")).thenReturn(Optional.of(admin));
        when(tagRepository.findById(10L)).thenReturn(Optional.of(global));
        when(tagRepository.existsByUserAndTagNameIgnoreCase(admin, "personal")).thenReturn(false);
        when(tagRepository.saveAndFlush(global)).thenReturn(global);
        when(tagRepository.findByTagNameAndUserNot("personal", admin)).thenReturn(List.of());
        when(noteRepository.countNotesByTagIds(List.of(10L))).thenReturn(List.of());

        GlobalTagResponse response = adminTagService.rename("admin-uuid", 10L, new RenameGlobalTagRequest("personal"));

        assertThat(response.tagName()).isEqualTo("personal");
        assertThat(global.getTagName()).isEqualTo("personal");
    }

    @Test
    void shouldFuseCollidingPrivatesOnGlobalCreate() {
        User admin = admin();
        User owner = user();
        Tag global = Tag.builder().id(10L).user(admin).tagName("work").build();
        Tag priv = Tag.builder().id(5L).user(owner).tagName("work").build();
        Note note = note(owner, priv);
        when(userRepository.findByUuidUser("admin-uuid")).thenReturn(Optional.of(admin));
        when(tagRepository.existsByUserAndTagNameIgnoreCase(admin, "work")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> {
            Tag tag = invocation.getArgument(0);
            tag.setId(10L);
            return tag;
        });
        when(tagRepository.findByTagNameAndUserNot("work", admin)).thenReturn(List.of(priv));
        when(noteRepository.findByTags_Id(5L)).thenReturn(List.of(note));
        when(noteRepository.countNotesByTagIds(List.of(10L))).thenReturn(List.of(new TagUsageCount(10L, 1L)));

        GlobalTagResponse response = adminTagService.create("admin-uuid", new CreateTagRequest("work"));

        assertThat(response.noteCount()).isEqualTo(1L);
        assertThat(note.getTags()).containsExactly(global);
        verify(tagRepository).delete(priv);
    }

    @Test
    void shouldDeleteGlobalAndRecreatePrivatePerOwner() {
        User admin = admin();
        User owner = user();
        Tag global = Tag.builder().id(10L).user(admin).tagName("work").build();
        Note first = note(owner, global);
        Note second = note(owner, global);
        when(userRepository.findByUuidUser("admin-uuid")).thenReturn(Optional.of(admin));
        when(tagRepository.findById(10L)).thenReturn(Optional.of(global));
        when(noteRepository.findByTags_Id(10L)).thenReturn(List.of(first, second));
        when(tagRepository.findByUserAndTagName(eq(owner), eq("work"))).thenReturn(Optional.empty());
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> {
            Tag tag = invocation.getArgument(0);
            tag.setId(20L);
            return tag;
        });

        adminTagService.delete("admin-uuid", 10L);

        assertThat(first.getTags()).hasSize(1).noneMatch(tag -> tag.getId().equals(10L));
        assertThat(second.getTags()).hasSize(1).noneMatch(tag -> tag.getId().equals(10L));
        assertThat(first.getTags()).containsExactly(second.getTags().iterator().next());
        verify(tagRepository).delete(global);
    }

    private Note note(User owner, Tag tag) {
        return Note.builder()
            .uuidNote(java.util.UUID.randomUUID().toString())
            .user(owner)
            .title("Title")
            .content("Content")
            .position(100_000L)
            .tags(new HashSet<>(Set.of(tag)))
            .build();
    }

    private User admin() {
        return userWithRole(2L, "admin-uuid", UserRole.ADMIN);
    }

    private User user() {
        return userWithRole(1L, "uuid", UserRole.USER);
    }

    private User userWithRole(Long id, String uuid, UserRole role) {
        return User.builder()
            .id(id)
            .uuidUser(uuid)
            .email(uuid + "@example.com")
            .name("Name")
            .passwordHash("hashedPassword")
            .role(role)
            .userStatus(UserStatus.ACTIVE)
            .build();
    }
}
