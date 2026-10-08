package fcs.memora.admin;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminControllerTest {

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
            .lastNotePosition(0L)
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
            .lastNotePosition(0L)
            .build();
        userRepository.save(user);
        return jwtService.generateAccessToken(user);
    }

    @Test
    void shouldAllowAdminToChangeUserStatus() throws Exception {
        String token = createAdminToken();
        User target = User.builder()
            .uuidUser("target-uuid")
            .email("target@example.com")
            .name("Target")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        userRepository.save(target);

        UpdateStatusRequest request = new UpdateStatusRequest(UserStatus.BLOCKED);

        mockMvc.perform(patch("/admin/users/target-uuid/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());
    }

    @Test
    void shouldPreventUserFromAccessingAdminEndpoint() throws Exception {
        String token = createUserToken();
        UpdateStatusRequest request = new UpdateStatusRequest(UserStatus.BLOCKED);

        mockMvc.perform(patch("/admin/users/target-uuid/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldPreventAdminFromChangingOwnStatus() throws Exception {
        String token = createAdminToken();
        UpdateStatusRequest request = new UpdateStatusRequest(UserStatus.BLOCKED);

        mockMvc.perform(patch("/admin/users/admin-uuid/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}
