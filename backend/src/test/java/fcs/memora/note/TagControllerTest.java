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
            .lastNotePosition(0L)
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
