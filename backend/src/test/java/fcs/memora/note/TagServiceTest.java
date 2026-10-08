package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.TagResponse;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class TagServiceTest {

    @Mock
    private TagRepository tagRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TagService tagService;

    @Test
    void shouldCreateTag() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.existsByUserAndTagNameIgnoreCase(user, "work")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> {
            Tag tag = invocation.getArgument(0);
            tag.setId(1L);
            return tag;
        });

        TagResponse response = tagService.create("uuid", new CreateTagRequest("  WORK  "));

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.tagName()).isEqualTo("work");
    }

    @Test
    void shouldRejectDuplicateTag() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.existsByUserAndTagNameIgnoreCase(user, "work")).thenReturn(true);

        assertThatThrownBy(() -> tagService.create("uuid", new CreateTagRequest("work")))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void shouldListTagsOrdered() {
        User user = user();
        when(userRepository.findByUuidUser("uuid")).thenReturn(Optional.of(user));
        when(tagRepository.findByUserOrderByTagNameAsc(user)).thenReturn(List.of(
            Tag.builder().id(1L).user(user).tagName("alpha").build(),
            Tag.builder().id(2L).user(user).tagName("beta").build()
        ));

        List<TagResponse> responses = tagService.list("uuid");

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).tagName()).isEqualTo("alpha");
        assertThat(responses.get(1).tagName()).isEqualTo("beta");
    }

    private User user() {
        return User.builder()
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
