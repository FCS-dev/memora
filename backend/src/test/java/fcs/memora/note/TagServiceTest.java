package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import fcs.memora.admin.TagOwnerResolver;
import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.CreateTagResponse;
import fcs.memora.note.dto.RenameTagRequest;
import fcs.memora.note.dto.TagResponse;
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
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@ExtendWith(MockitoExtension.class)
class TagServiceTest {

    @Mock
    private TagRepository tagRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TagOwnerResolver tagOwnerResolver;

    @Mock
    private NoteRepository noteRepository;

    @InjectMocks
    private TagService tagService;

    @Test
    void shouldCreatePrivateTag() {
        User user = user(1L, "uuid", UserRole.USER);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.empty());
        when(tagRepository.existsByUserAndTagNameIgnoreCase(user, "work")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> {
            Tag tag = invocation.getArgument(0);
            tag.setId(1L);
            return tag;
        });

        CreateTagResponse response = tagService.create("uuid", new CreateTagRequest("  WORK  "));

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.tagName()).isEqualTo("work");
        assertThat(response.global()).isFalse();
        assertThat(response.reused()).isFalse();
    }

    @Test
    void shouldReuseGlobalTagOnCreate() {
        User user = user(1L, "uuid", UserRole.USER);
        User admin = user(2L, "admin-uuid", UserRole.ADMIN);
        Tag global = Tag.builder().id(9L).user(admin).tagName("work").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.of(admin));
        when(tagRepository.findByUserAndTagName(admin, "work")).thenReturn(Optional.of(global));

        CreateTagResponse response = tagService.create("uuid", new CreateTagRequest("Work"));

        assertThat(response.id()).isEqualTo(9L);
        assertThat(response.global()).isTrue();
        assertThat(response.reused()).isTrue();
        verify(tagRepository, never()).save(any(Tag.class));
    }

    @Test
    void shouldRejectDuplicateTag() {
        User user = user(1L, "uuid", UserRole.USER);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.empty());
        when(tagRepository.existsByUserAndTagNameIgnoreCase(user, "work")).thenReturn(true);

        assertThatThrownBy(() -> tagService.create("uuid", new CreateTagRequest("work")))
            .isInstanceOf(DuplicateTagException.class);
    }

    @Test
    void shouldListGlobalsAndPrivatesOrdered() {
        User user = user(1L, "uuid", UserRole.USER);
        User admin = user(2L, "admin-uuid", UserRole.ADMIN);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.of(admin));
        when(tagRepository.findByUserOrderByTagNameAsc(admin)).thenReturn(List.of(
            Tag.builder().id(9L).user(admin).tagName("beta").build()
        ));
        when(tagRepository.findByUserOrderByTagNameAsc(user)).thenReturn(List.of(
            Tag.builder().id(1L).user(user).tagName("alpha").build()
        ));

        List<TagResponse> responses = tagService.list("uuid");

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).tagName()).isEqualTo("alpha");
        assertThat(responses.get(0).global()).isFalse();
        assertThat(responses.get(1).tagName()).isEqualTo("beta");
        assertThat(responses.get(1).global()).isTrue();
    }

    @Test
    void shouldHidePrivateTagWithGlobalName() {
        User user = user(1L, "uuid", UserRole.USER);
        User admin = user(2L, "admin-uuid", UserRole.ADMIN);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.of(admin));
        when(tagRepository.findByUserOrderByTagNameAsc(admin)).thenReturn(List.of(
            Tag.builder().id(9L).user(admin).tagName("work").build()
        ));
        when(tagRepository.findByUserOrderByTagNameAsc(user)).thenReturn(List.of(
            Tag.builder().id(1L).user(user).tagName("work").build()
        ));

        List<TagResponse> responses = tagService.list("uuid");

        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).global()).isTrue();
    }

    @Test
    void shouldIncludeNoteCountPerUserInList() {
        User user = user(1L, "uuid", UserRole.USER);
        User admin = user(2L, "admin-uuid", UserRole.ADMIN);
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.of(admin));
        when(tagRepository.findByUserOrderByTagNameAsc(admin)).thenReturn(List.of(
            Tag.builder().id(9L).user(admin).tagName("beta").build()
        ));
        when(tagRepository.findByUserOrderByTagNameAsc(user)).thenReturn(List.of(
            Tag.builder().id(1L).user(user).tagName("alpha").build()
        ));
        when(noteRepository.countNotesByTagIdsAndUser(List.of(9L, 1L), user)).thenReturn(List.of(
            new TagUsageCount(9L, 3L)
        ));

        List<TagResponse> responses = tagService.list("uuid");

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).tagName()).isEqualTo("alpha");
        assertThat(responses.get(0).noteCount()).isZero();
        assertThat(responses.get(1).tagName()).isEqualTo("beta");
        assertThat(responses.get(1).noteCount()).isEqualTo(3L);
    }

    @Test
    void shouldRenamePrivateTag() {
        User user = user(1L, "uuid", UserRole.USER);
        Tag tag = Tag.builder().id(5L).user(user).tagName("old").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.empty());
        when(tagRepository.existsByUserAndTagNameIgnoreCase(user, "new")).thenReturn(false);
        when(tagRepository.saveAndFlush(any(Tag.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(noteRepository.countNotesByTagIdsAndUser(List.of(5L), user)).thenReturn(List.of(new TagUsageCount(5L, 2L)));

        TagResponse response = tagService.rename("uuid", 5L, new RenameTagRequest("  NEW  "));

        assertThat(response.tagName()).isEqualTo("new");
        assertThat(response.global()).isFalse();
        assertThat(response.noteCount()).isEqualTo(2L);
    }

    @Test
    void shouldKeepNameWhenRenamingToSameNormalizedName() {
        User user = user(1L, "uuid", UserRole.USER);
        Tag tag = Tag.builder().id(5L).user(user).tagName("work").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));
        when(noteRepository.countNotesByTagIdsAndUser(List.of(5L), user)).thenReturn(List.of());

        TagResponse response = tagService.rename("uuid", 5L, new RenameTagRequest("WORK"));

        assertThat(response.tagName()).isEqualTo("work");
        verify(tagRepository, never()).saveAndFlush(any(Tag.class));
    }

    @Test
    void shouldRejectRenameToExistingPrivateName() {
        User user = user(1L, "uuid", UserRole.USER);
        Tag tag = Tag.builder().id(5L).user(user).tagName("old").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.empty());
        when(tagRepository.existsByUserAndTagNameIgnoreCase(user, "taken")).thenReturn(true);

        assertThatThrownBy(() -> tagService.rename("uuid", 5L, new RenameTagRequest("taken")))
            .isInstanceOf(DuplicateTagException.class);
    }

    @Test
    void shouldFuseIntoGlobalOnRename() {
        User user = user(1L, "uuid", UserRole.USER);
        User admin = user(2L, "admin-uuid", UserRole.ADMIN);
        Tag tag = Tag.builder().id(5L).user(user).tagName("old").build();
        Tag global = Tag.builder().id(9L).user(admin).tagName("work").build();
        Note note = Note.builder().id(1L).user(user).tags(new HashSet<>(Set.of(tag))).build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));
        when(tagOwnerResolver.catalogOwner()).thenReturn(Optional.of(admin));
        when(tagRepository.findByUserAndTagName(admin, "work")).thenReturn(Optional.of(global));
        when(noteRepository.findByTags_Id(5L)).thenReturn(List.of(note));
        when(noteRepository.countNotesByTagIdsAndUser(List.of(9L), user)).thenReturn(List.of(new TagUsageCount(9L, 1L)));

        TagResponse response = tagService.rename("uuid", 5L, new RenameTagRequest("work"));

        assertThat(response.id()).isEqualTo(9L);
        assertThat(response.global()).isTrue();
        assertThat(note.getTags()).containsExactly(global);
        verify(tagRepository).delete(tag);
    }

    @Test
    void shouldRejectRenamingForeignTag() {
        User user = user(1L, "uuid", UserRole.USER);
        User other = user(3L, "other-uuid", UserRole.USER);
        Tag tag = Tag.builder().id(5L).user(other).tagName("old").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));

        assertThatThrownBy(() -> tagService.rename("uuid", 5L, new RenameTagRequest("new")))
            .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void shouldDeletePrivateTagAndDetachFromNotes() {
        User user = user(1L, "uuid", UserRole.USER);
        Tag tag = Tag.builder().id(5L).user(user).tagName("work").build();
        Note note = Note.builder().id(1L).user(user).tags(new HashSet<>(Set.of(tag))).build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));
        when(noteRepository.findByTags_Id(5L)).thenReturn(List.of(note));

        tagService.delete("uuid", 5L);

        assertThat(note.getTags()).isEmpty();
        verify(tagRepository).delete(tag);
    }

    @Test
    void shouldRejectDeletingForeignTag() {
        User user = user(1L, "uuid", UserRole.USER);
        User other = user(3L, "other-uuid", UserRole.USER);
        Tag tag = Tag.builder().id(5L).user(other).tagName("work").build();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findById(5L)).thenReturn(Optional.of(tag));

        assertThatThrownBy(() -> tagService.delete("uuid", 5L))
            .isInstanceOf(UsernameNotFoundException.class);
    }

    private User user(Long id, String uuid, UserRole role) {
        return User.builder()
            .id(id)
            .uuidUser(uuid)
            .email(uuid + "@example.com")
            .name("User")
            .passwordHash("hashedPassword")
            .role(role)
            .userStatus(UserStatus.ACTIVE)
            .build();
    }
}
