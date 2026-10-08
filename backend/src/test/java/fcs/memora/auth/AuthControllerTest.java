package fcs.memora.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.auth.dto.LoginRequest;
import fcs.memora.auth.dto.RegisterRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordService passwordService;

    @Test
    void shouldRegisterUser() throws Exception {
        RegisterRequest request = new RegisterRequest("new@example.com", "New User", "password123");

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());
    }

    @Test
    void shouldRejectDuplicateEmail() throws Exception {
        User existing = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("existing@example.com")
            .name("Existing")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        userRepository.save(existing);

        RegisterRequest request = new RegisterRequest("existing@example.com", "New User", "password123");

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldLoginAndReturnTokens() throws Exception {
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("login@example.com")
            .name("Login User")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        userRepository.save(user);

        LoginRequest request = new LoginRequest("login@example.com", "password123");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(cookie().exists("refreshToken"));
    }

    @Test
    void shouldRejectInvalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("missing@example.com", "password123");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }
}
