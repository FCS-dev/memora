package fcs.memora.note;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.UpdateNoteRequest;
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

import java.util.Map;
import java.util.Set;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NoteControllerTest {

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
            .lastNotePosition(0L)
            .build();
        userRepository.save(user);
        return jwtService.generateAccessToken(user);
    }

    private User createUser() {
        User user = User.builder()
            .uuidUser("user-uuid")
            .email("user@example.com")
            .name("User")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastNotePosition(0L)
            .build();
        return userRepository.save(user);
    }

    @Test
    void shouldCreateNote() throws Exception {
        String token = createUserToken();
        CreateNoteRequest request = new CreateNoteRequest("Title", "Content", false, null, null, false, false, null);

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Title"))
            .andExpect(jsonPath("$.position").value(100000));
    }

    @Test
    void shouldCreateChecklistNote() throws Exception {
        String token = createUserToken();
        CreateNoteRequest request = new CreateNoteRequest(
            "Checklist", "ignored", true, Map.of("task1", false), null, false, false, null);

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.checklistMode").value(true))
            .andExpect(jsonPath("$.checklistItems.task1").value(false));
    }

    @Test
    void shouldListNotes() throws Exception {
        String token = createUserToken();
        CreateNoteRequest request = new CreateNoteRequest("Title", "Content", false, null, null, false, false, null);

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        mockMvc.perform(get("/notes")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].title").value("Title"));
    }

    @Test
    void shouldCreateNoteWithTag() throws Exception {
        User user = createUser();
        String token = jwtService.generateAccessToken(user);
        Tag tag = tagRepository.save(Tag.builder().user(user).tagName("work").build());

        CreateNoteRequest request = new CreateNoteRequest(
            "Tagged", "Content", false, null, null, false, false, Set.of(tag.getId()));

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tags[0]").value("work"));
    }

    @Test
    void shouldUpdateNote() throws Exception {
        String token = createUserToken();
        CreateNoteRequest createRequest = new CreateNoteRequest("Title", "Content", false, null, null, false, false, null);
        String response = mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
            .andReturn().getResponse().getContentAsString();
        Long noteId = objectMapper.readTree(response).get("id").asLong();

        UpdateNoteRequest updateRequest = new UpdateNoteRequest("Updated", "Updated content", false, null, null, true, false, null);

        mockMvc.perform(put("/notes/" + noteId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("Updated"))
            .andExpect(jsonPath("$.isPinned").value(true));
    }

    @Test
    void shouldDeleteNote() throws Exception {
        String token = createUserToken();
        CreateNoteRequest createRequest = new CreateNoteRequest("Title", "Content", false, null, null, false, false, null);
        String response = mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
            .andReturn().getResponse().getContentAsString();
        Long noteId = objectMapper.readTree(response).get("id").asLong();

        mockMvc.perform(delete("/notes/" + noteId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());
    }
}
