package fcs.memora.note;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
import fcs.memora.note.dto.CreateTagRequest;
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
            .andExpect(jsonPath("$[0].tagName").value("work"));
    }
}
