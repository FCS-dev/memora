package fcs.memora.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
import fcs.memora.user.dto.ChangePasswordRequest;
import fcs.memora.user.dto.UpdateNameRequest;
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
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordService passwordService;

    @Autowired
    private JwtService jwtService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String createTokenAndUser() {
        User user = User.builder()
            .uuidUser("uuiduuiduuiduuiduuiduuiduuiduuid")
            .email("user@example.com")
            .name("User")
            .passwordHash(passwordService.hashPassword("currentPass"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        userRepository.save(user);
        return jwtService.generateAccessToken(user);
    }

    @Test
    void shouldGetProfile() throws Exception {
        String token = createTokenAndUser();

        mockMvc.perform(get("/users/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("user@example.com"))
            .andExpect(jsonPath("$.name").value("User"));
    }

    @Test
    void shouldUpdateName() throws Exception {
        String token = createTokenAndUser();
        UpdateNameRequest request = new UpdateNameRequest("Updated Name");

        mockMvc.perform(put("/users/me")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Updated Name"));
    }

    @Test
    void shouldChangePassword() throws Exception {
        String token = createTokenAndUser();
        ChangePasswordRequest request = new ChangePasswordRequest("currentPass", "newPass123");

        mockMvc.perform(put("/users/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());
    }

    @Test
    void shouldRejectChangePasswordWithWrongCurrentPassword() throws Exception {
        String token = createTokenAndUser();
        ChangePasswordRequest request = new ChangePasswordRequest("wrongPass", "newPass123");

        mockMvc.perform(put("/users/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }
}
