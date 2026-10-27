package fcs.memora.ai;

import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AiConsentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordService passwordService;

    @Autowired
    private JwtService jwtService;

    @Test
    void profileStartsWithNotSetAndAiDisabled() throws Exception {
        String token = createTokenAndUser(UserRole.USER, "user@example.com", "uuid-user-1");

        mockMvc.perform(get("/users/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.aiEnabled").value(false))
            .andExpect(jsonPath("$.aiConsent").value("NOT_SET"))
            .andExpect(jsonPath("$.aiConsentRequired").value(true))
            .andExpect(jsonPath("$.aiConsentNoticeVersion").value("1"));
    }

    @Test
    void grantsConsentAndReturnsProfile() throws Exception {
        String token = createTokenAndUser(UserRole.USER, "user2@example.com", "uuid-user-2");

        mockMvc.perform(put("/users/me/ai-consent")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"GRANTED\",\"noticeVersion\":\"1\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.aiConsent").value("GRANTED"))
            .andExpect(jsonPath("$.aiConsentRequired").value(false));
    }

    @Test
    void deniesConsentAndDoesNotRequireAutomaticPrompt() throws Exception {
        String token = createTokenAndUser(UserRole.USER, "user3@example.com", "uuid-user-3");

        mockMvc.perform(put("/users/me/ai-consent")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"DENIED\",\"noticeVersion\":\"1\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.aiConsent").value("DENIED"))
            .andExpect(jsonPath("$.aiConsentRequired").value(false));
    }

    @Test
    void rejectsInvalidNoticeVersion() throws Exception {
        String token = createTokenAndUser(UserRole.USER, "user4@example.com", "uuid-user-4");

        mockMvc.perform(put("/users/me/ai-consent")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"GRANTED\",\"noticeVersion\":\"99\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsAdminConsentUpdate() throws Exception {
        String token = createTokenAndUser(UserRole.ADMIN, "admin@example.com", "uuid-admin-1");

        mockMvc.perform(put("/users/me/ai-consent")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"GRANTED\",\"noticeVersion\":\"1\"}"))
            .andExpect(status().isForbidden());
    }

    private String createTokenAndUser(UserRole role, String email, String uuid) {
        User user = User.builder()
            .uuidUser(uuid)
            .email(email)
            .name("User")
            .passwordHash(passwordService.hashPassword("currentPass"))
            .role(role)
            .userStatus(UserStatus.ACTIVE)
            .avatarColor("#4F5DFF")
            .build();
        userRepository.save(user);
        return jwtService.generateAccessToken(user);
    }
}
