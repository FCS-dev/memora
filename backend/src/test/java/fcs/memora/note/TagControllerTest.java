package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.RenameTagRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private PasswordService passwordService;

    @Autowired
    private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String createUserToken() {
        User user = User.builder()
            .uuidUser("user-uuid")
            .email("user@example.com")
            .name("User")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
        userRepository.save(user);
        return jwtService.generateAccessToken(user);
    }

    @Test
    void shouldCreateTag() throws Exception {
        String token = createUserToken();
        CreateTagRequest request = new CreateTagRequest("  WORK  ");

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tagName").value("work"));
    }

    @Test
    void shouldReuseGlobalTagOnCreate() throws Exception {
        User admin = User.builder()
            .uuidUser("admin-uuid")
            .email("admin@example.com")
            .name("Admin")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .build();
        userRepository.save(admin);
        tagRepository.save(Tag.builder().user(admin).tagName("work").build());
        String token = createUserToken();

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("Work"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.global").value(true))
            .andExpect(jsonPath("$.reused").value(true));
    }

    @Test
    void shouldListGlobalAndPrivateTags() throws Exception {
        User admin = User.builder()
            .uuidUser("admin-uuid")
            .email("admin@example.com")
            .name("Admin")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .build();
        userRepository.save(admin);
        tagRepository.save(Tag.builder().user(admin).tagName("work").build());
        String token = createUserToken();

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("personal"))));

        mockMvc.perform(get("/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].tagName").value("personal"))
            .andExpect(jsonPath("$[0].global").value(false))
            .andExpect(jsonPath("$[1].tagName").value("work"))
            .andExpect(jsonPath("$[1].global").value(true));
    }

    @Test
    void shouldReturn409WhenTagAlreadyExists() throws Exception {
        String token = createUserToken();

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("work"))))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("  WORK  "))))
            .andExpect(status().isConflict());
    }

    @Test
    void shouldReturn400WhenTagNameIsTooLong() throws Exception {
        String token = createUserToken();

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("a".repeat(30)))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldKeepPrivateTagWithoutNotes() throws Exception {
        String token = createUserToken();

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("keep"))));

        mockMvc.perform(get("/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].tagName").value("keep"));
    }

    @Test
    void shouldListTags() throws Exception {
        String token = createUserToken();

        mockMvc.perform(post("/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("work"))));

        mockMvc.perform(get("/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].tagName").value("work"))
            .andExpect(jsonPath("$[0].noteCount").value(0));
    }

    @Test
    void shouldListNoteCountPerUser() throws Exception {
        String token = createUserToken();
        User user = userRepository.findByUuidUser("user-uuid").orElseThrow();
        Tag tag = tagRepository.save(Tag.builder().user(user).tagName("work").build());

        Note tagged = Note.builder()
            .uuidNote("11111111-1111-1111-1111-111111111111")
            .user(user)
            .title("Nota")
            .content("contenido")
            .position(1000L)
            .build();
        tagged.setTags(java.util.Set.of(tag));
        noteRepository.save(tagged);

        mockMvc.perform(get("/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].tagName").value("work"))
            .andExpect(jsonPath("$[0].noteCount").value(1));
    }

    @Test
    void shouldRenamePrivateTag() throws Exception {
        String token = createUserToken();
        User user = userRepository.findByUuidUser("user-uuid").orElseThrow();
        Tag tag = tagRepository.save(Tag.builder().user(user).tagName("old").build());

        mockMvc.perform(patch("/tags/" + tag.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RenameTagRequest("new"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tagName").value("new"))
            .andExpect(jsonPath("$.global").value(false))
            .andExpect(jsonPath("$.noteCount").value(0));
    }

    @Test
    void shouldReturn409WhenRenamingToExistingPrivateName() throws Exception {
        String token = createUserToken();
        User user = userRepository.findByUuidUser("user-uuid").orElseThrow();
        tagRepository.save(Tag.builder().user(user).tagName("taken").build());
        Tag tag = tagRepository.save(Tag.builder().user(user).tagName("old").build());

        mockMvc.perform(patch("/tags/" + tag.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RenameTagRequest("taken"))))
            .andExpect(status().isConflict());
    }

    @Test
    void shouldReturn404WhenRenamingForeignTag() throws Exception {
        User other = userRepository.save(User.builder()
            .uuidUser("other-uuid")
            .email("other@example.com")
            .name("Other")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());
        Tag foreign = tagRepository.save(Tag.builder().user(other).tagName("old").build());
        String token = createUserToken();

        mockMvc.perform(patch("/tags/" + foreign.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RenameTagRequest("new"))))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldDeletePrivateTag() throws Exception {
        String token = createUserToken();
        User user = userRepository.findByUuidUser("user-uuid").orElseThrow();
        Tag tag = tagRepository.save(Tag.builder().user(user).tagName("old").build());

        mockMvc.perform(delete("/tags/" + tag.getId())
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());

        assertThat(tagRepository.findById(tag.getId())).isEmpty();
    }

    @Test
    void shouldReturn404WhenDeletingForeignTag() throws Exception {
        User other = userRepository.save(User.builder()
            .uuidUser("other-uuid")
            .email("other@example.com")
            .name("Other")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());
        Tag foreign = tagRepository.save(Tag.builder().user(other).tagName("old").build());
        String token = createUserToken();

        mockMvc.perform(delete("/tags/" + foreign.getId())
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }
}
