package fcs.memora.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.admin.dto.RenameGlobalTagRequest;
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
class AdminTagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordService passwordService;

    @Autowired
    private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String createAdminToken() {
        User admin = User.builder()
            .uuidUser("admin-uuid")
            .email("admin@example.com")
            .name("Admin")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .build();
        userRepository.save(admin);
        return jwtService.generateAccessToken(admin);
    }

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
    void shouldCreateAndListGlobalTags() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/admin/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("  WORK  "))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tagName").value("work"))
            .andExpect(jsonPath("$.noteCount").value(0));

        mockMvc.perform(get("/admin/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].tagName").value("work"));
    }

    @Test
    void shouldRenameAndDeleteGlobalTag() throws Exception {
        String token = createAdminToken();

        String body = mockMvc.perform(post("/admin/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("work"))))
            .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(body).get("id").asLong();

        mockMvc.perform(patch("/admin/tags/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new RenameGlobalTagRequest("personal"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tagName").value("personal"));

        mockMvc.perform(delete("/admin/tags/" + id)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/admin/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void shouldReturn409OnDuplicateGlobalTag() throws Exception {
        String token = createAdminToken();

        mockMvc.perform(post("/admin/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("work"))));

        mockMvc.perform(post("/admin/tags")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateTagRequest("WORK"))))
            .andExpect(status().isConflict());
    }

    @Test
    void shouldPreventUserFromAccessingAdminTags() throws Exception {
        String token = createUserToken();

        mockMvc.perform(get("/admin/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }
}
