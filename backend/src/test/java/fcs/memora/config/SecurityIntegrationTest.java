package fcs.memora.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
import fcs.memora.note.Note;
import fcs.memora.note.NoteRepository;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private PasswordService passwordService;

    @Autowired
    private JwtService jwtService;

    @Test
    void shouldRejectProtectedEndpointsWithoutToken() throws Exception {
        mockMvc.perform(get("/users/me"))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/notes"))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/tags"))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectAdminEndpointWithUserToken() throws Exception {
        User user = userRepository.save(User.builder()
            .uuidUser("user-uuid")
            .email("user@example.com")
            .name("User")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build());
        String token = jwtService.generateAccessToken(user);

        mockMvc.perform(get("/admin/users/other-uuid/status")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldAllowUserAccessToOwnNotes() throws Exception {
        User user = userRepository.save(User.builder()
            .uuidUser("user-uuid")
            .email("user@example.com")
            .name("User")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build());
        String token = jwtService.generateAccessToken(user);

        mockMvc.perform(get("/notes")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void shouldNotAllowAccessToAnotherUsersNote() throws Exception {
        User owner = userRepository.save(User.builder()
            .uuidUser("owner-uuid")
            .email("owner@example.com")
            .name("Owner")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build());
        Note note = noteRepository.save(Note.builder()
            .user(owner)
            .title("Private")
            .content("Content")
            .position(100000L)
            .build());

        User other = userRepository.save(User.builder()
            .uuidUser("other-uuid")
            .email("other@example.com")
            .name("Other")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build());
        String token = jwtService.generateAccessToken(other);

        mockMvc.perform(get("/notes/" + note.getId())
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }
}
