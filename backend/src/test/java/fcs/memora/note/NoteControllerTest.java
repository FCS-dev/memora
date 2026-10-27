package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.auth.JwtService;
import fcs.memora.auth.PasswordService;
import fcs.memora.note.dto.ChangeNoteGroupRequest;
import fcs.memora.note.dto.ChecklistItem;
import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.ReorderNoteRequest;
import fcs.memora.note.dto.UpdateChecklistItemRequest;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

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
        return jwtService.generateAccessToken(createUser());
    }

    private User createUser() {
        User user = User.builder()
            .uuidUser("user-uuid")
            .email("user@example.com")
            .name("User")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build();
        return userRepository.save(user);
    }

    private String createNote(String token, String title, boolean pinned) throws Exception {
        CreateNoteRequest request = new CreateNoteRequest(title, "Content", false, null, null, pinned, false, null);
        String response = mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("uuidNote").asText();
    }

    private String createChecklistNote(String token, List<ChecklistItem> items) throws Exception {
        CreateNoteRequest request = new CreateNoteRequest(
            "Checklist", "", true, items, null, false, false, null);
        String response = mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("uuidNote").asText();
    }

    @Test
    void shouldCreateNote() throws Exception {
        String token = createUserToken();

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new CreateNoteRequest("Title", "Content", false, null, null, false, false, null))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.title").value("Title"))
            .andExpect(jsonPath("$.uuidNote").isNotEmpty())
            .andExpect(jsonPath("$.position").doesNotExist());
    }

    @Test
    void shouldReturnExistingNoteForSameIdempotencyKey() throws Exception {
        String token = createUserToken();
        CreateNoteRequest request = new CreateNoteRequest(
            "Title", "Content", false, null, null, false, false, null, "same-key"
        );

        String first = mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        String firstUuid = objectMapper.readTree(first).get("uuidNote").asText();

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.uuidNote").value(firstUuid));
    }

    @Test
    void shouldRejectSameIdempotencyKeyWithDifferentData() throws Exception {
        String token = createUserToken();
        CreateNoteRequest first = new CreateNoteRequest(
            "Title", "Content", false, null, null, false, false, null, "conflict-key"
        );
        CreateNoteRequest second = new CreateNoteRequest(
            "Other", "Content", false, null, null, false, false, null, "conflict-key"
        );

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(first)))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(second)))
            .andExpect(status().isConflict());
    }

    @Test
    void shouldRejectAdminNoteCreation() throws Exception {
        User admin = User.builder()
            .uuidUser("admin-uuid-create")
            .email("admin-create@example.com")
            .name("Admin")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.ADMIN)
            .userStatus(UserStatus.ACTIVE)
            .build();
        userRepository.save(admin);
        String token = jwtService.generateAccessToken(admin);

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new CreateNoteRequest("Title", "Content", false, null, null, false, false, null))))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldCreateChecklistNote() throws Exception {
        String token = createUserToken();
        CreateNoteRequest request = new CreateNoteRequest(
            "Checklist", "ignored", true, List.of(new ChecklistItem("task1", false)), null, false, false, null);

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.checklistMode").value(true))
            .andExpect(jsonPath("$.checklistItems[0].text").value("task1"))
            .andExpect(jsonPath("$.checklistItems[0].checked").value(false));
    }

    @Test
    void shouldRejectArchivedCreation() throws Exception {
        String token = createUserToken();
        CreateNoteRequest request = new CreateNoteRequest("Title", "c", false, null, null, false, true, null);

        mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldListNotes() throws Exception {
        String token = createUserToken();
        createNote(token, "Title", false);

        mockMvc.perform(get("/notes").header("Authorization", "Bearer " + token))
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
        String uuid = createNote(token, "Title", false);

        UpdateNoteRequest updateRequest = new UpdateNoteRequest("Updated", "Updated content", false, null, null, true, null);

        mockMvc.perform(put("/notes/" + uuid)
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
        String uuid = createNote(token, "Title", false);

        mockMvc.perform(delete("/notes/" + uuid).header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());
    }

    @Test
    void shouldReorderNote() throws Exception {
        String token = createUserToken();
        String first = createNote(token, "First", false);
        String second = createNote(token, "Second", false);

        ReorderNoteRequest request = new ReorderNoteRequest(null, first);

        mockMvc.perform(patch("/notes/" + second + "/position")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.uuidNote").value(second));

        mockMvc.perform(get("/notes").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].uuidNote").value(second))
            .andExpect(jsonPath("$[1].uuidNote").value(first));
    }

    @Test
    void shouldChangeGroupToPinned() throws Exception {
        String token = createUserToken();
        String uuid = createNote(token, "Note", false);

        mockMvc.perform(patch("/notes/" + uuid + "/group")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ChangeNoteGroupRequest(NoteGroup.PINNED))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isPinned").value(true));
    }

    @Test
    void shouldListArchivedNotes() throws Exception {
        String token = createUserToken();
        String uuid = createNote(token, "Archived", false);

        mockMvc.perform(patch("/notes/" + uuid + "/group")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ChangeNoteGroupRequest(NoteGroup.ARCHIVED))))
            .andExpect(status().isOk());

        mockMvc.perform(get("/notes/archived").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].uuidNote").value(uuid))
            .andExpect(jsonPath("$[0].isArchived").value(true));
    }

    @Test
    void shouldRejectMalformedUuid() throws Exception {
        String token = createUserToken();

        mockMvc.perform(get("/notes/not-a-uuid").header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturnNotFoundForUnknownUuid() throws Exception {
        String token = createUserToken();

        mockMvc.perform(get("/notes/" + UUID.randomUUID()).header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldMarkChecklistItem() throws Exception {
        String token = createUserToken();
        String uuid = createChecklistNote(token, List.of(new ChecklistItem("task1", false), new ChecklistItem("task2", false)));

        mockMvc.perform(patch("/notes/" + uuid + "/checklist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateChecklistItemRequest("task1", true))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.checklistItems[0].text").value("task1"))
            .andExpect(jsonPath("$.checklistItems[0].checked").value(true))
            .andExpect(jsonPath("$.checklistItems[1].text").value("task2"))
            .andExpect(jsonPath("$.checklistItems[1].checked").value(false))
            .andExpect(jsonPath("$.position").doesNotExist());
    }

    @Test
    void shouldMarkChecklistItemIdempotently() throws Exception {
        String token = createUserToken();
        String uuid = createChecklistNote(token, List.of(new ChecklistItem("task1", false)));

        UpdateChecklistItemRequest request = new UpdateChecklistItemRequest("task1", true);

        mockMvc.perform(patch("/notes/" + uuid + "/checklist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());

        mockMvc.perform(patch("/notes/" + uuid + "/checklist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.checklistItems[0].text").value("task1"))
            .andExpect(jsonPath("$.checklistItems[0].checked").value(true));
    }

    @Test
    void shouldReturnNotFoundWhenChecklistItemDoesNotExist() throws Exception {
        String token = createUserToken();
        String uuid = createChecklistNote(token, List.of(new ChecklistItem("task1", false)));

        mockMvc.perform(patch("/notes/" + uuid + "/checklist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateChecklistItemRequest("missing", true))))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldRejectChecklistItemOnNonChecklistNote() throws Exception {
        String token = createUserToken();
        String uuid = createNote(token, "Text", false);

        mockMvc.perform(patch("/notes/" + uuid + "/checklist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateChecklistItemRequest("task1", true))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void shouldNotMarkChecklistItemOfAnotherUsersNote() throws Exception {
        User owner = userRepository.save(User.builder()
            .uuidUser("owner-uuid")
            .email("owner2@example.com")
            .name("Owner")
            .passwordHash(passwordService.hashPassword("password123"))
            .role(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .build());
        String ownerToken = jwtService.generateAccessToken(owner);
        String uuid = createChecklistNote(ownerToken, List.of(new ChecklistItem("task1", false)));

        String otherToken = createUserToken();

        mockMvc.perform(patch("/notes/" + uuid + "/checklist")
                .header("Authorization", "Bearer " + otherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateChecklistItemRequest("task1", true))))
            .andExpect(status().isNotFound());
    }

    @Test
    void shouldRefreshUpdatedAtOnEveryMutation() throws Exception {
        String token = createUserToken();

        String createdJson = mockMvc.perform(post("/notes")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new CreateNoteRequest("Checklist", "", true, List.of(new ChecklistItem("task1", false)), null, false, false, null))))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String uuid = objectMapper.readTree(createdJson).get("uuidNote").asText();
        LocalDateTime createdUpdatedAt = LocalDateTime.parse(objectMapper.readTree(createdJson).get("updatedAt").asText());
        LocalDateTime createdAt = LocalDateTime.parse(objectMapper.readTree(createdJson).get("createdAt").asText());
        assertThat(createdUpdatedAt).isAfterOrEqualTo(createdAt);

        String toggledJson = mockMvc.perform(patch("/notes/" + uuid + "/checklist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new UpdateChecklistItemRequest("task1", true))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        LocalDateTime afterToggle = LocalDateTime.parse(objectMapper.readTree(toggledJson).get("updatedAt").asText());

        String updatedJson = mockMvc.perform(put("/notes/" + uuid)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new UpdateNoteRequest("Changed", "", true, List.of(new ChecklistItem("task1", true)), null, false, null))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        LocalDateTime afterUpdate = LocalDateTime.parse(objectMapper.readTree(updatedJson).get("updatedAt").asText());

        assertThat(afterToggle).isAfter(createdUpdatedAt);
        assertThat(afterUpdate).isAfter(afterToggle);
    }
}
