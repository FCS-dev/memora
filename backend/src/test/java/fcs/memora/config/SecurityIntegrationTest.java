package fcs.memora.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

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

    @Autowired
    private JwtProperties jwtProperties;

    @Test
    void shouldRejectProtectedEndpointsWithoutToken() throws Exception {
        mockMvc.perform(get("/users/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.detail").isNotEmpty());
        mockMvc.perform(get("/notes"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
        mockMvc.perform(get("/tags"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void shouldReturn401ForMalformedToken() throws Exception {
        mockMvc.perform(get("/notes")
                .header("Authorization", "Bearer not-a-real-token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void shouldReturn401ForExpiredToken() throws Exception {
        String expiredToken = Jwts.builder()
            .subject("uuiduuiduuiduuiduuiduuiduuiduuid")
            .issuedAt(new Date(System.currentTimeMillis() - 3_600_000))
            .expiration(new Date(System.currentTimeMillis() - 60_000))
            .signWith(Keys.hmacShaKeyFor(jwtProperties.secret().getBytes(StandardCharsets.UTF_8)))
            .compact();

        mockMvc.perform(get("/notes")
                .header("Authorization", "Bearer " + expiredToken))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.detail").isNotEmpty());
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
            .build());
        String token = jwtService.generateAccessToken(user);

        mockMvc.perform(get("/admin/users/other-uuid/status")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403))
            .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void shouldRejectTagsEndpointWithAdminToken() throws Exception {
        User admin = userRepository.save(User.builder()
            .uuidUser("admin-uuid")
            .email("admin@example.com")
            .name("Admin")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .build());
        String token = jwtService.generateAccessToken(admin);

        mockMvc.perform(get("/tags")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void shouldRequireAuthForAdminTags() throws Exception {
        mockMvc.perform(get("/admin/tags"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401));
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
            .build());
        Note note = noteRepository.save(Note.builder()
            .uuidNote(UUID.randomUUID().toString())
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
            .build());
        String token = jwtService.generateAccessToken(other);

        mockMvc.perform(get("/notes/" + note.getUuidNote())
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }
}
