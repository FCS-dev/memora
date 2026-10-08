package fcs.memora.note;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.NoteResponse;
import fcs.memora.note.dto.UpdateNoteRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserStatus;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class NoteService {

    private static final long POSITION_INCREMENT = 100_000L;

    private final NoteRepository noteRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public NoteService(NoteRepository noteRepository, TagRepository tagRepository, UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public NoteResponse create(String uuidUser, CreateNoteRequest request) {
        User user = findActiveUser(uuidUser);
        Set<Tag> tags = resolveTags(user, request.tagIds());

        long newPosition = user.getLastNotePosition() + POSITION_INCREMENT;
        user.setLastNotePosition(newPosition);
        userRepository.save(user);

        Note note = Note.builder()
            .user(user)
            .title(request.title())
            .content(request.checklistMode() ? "" : request.content())
            .contentJson(request.checklistMode() ? toJson(request.checklistItems()) : null)
            .checklistMode(request.checklistMode())
            .rememberAt(request.rememberAt())
            .isPinned(request.isPinned())
            .isArchived(request.isArchived())
            .position(newPosition)
            .tags(tags)
            .build();

        return toResponse(noteRepository.save(note));
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> list(String uuidUser) {
        User user = findActiveUser(uuidUser);
        return noteRepository.findByUserOrderByPositionDesc(user).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public NoteResponse getById(String uuidUser, Long id) {
        return toResponse(findUserNote(uuidUser, id));
    }

    @Transactional
    public NoteResponse update(String uuidUser, Long id, UpdateNoteRequest request) {
        Note note = findUserNote(uuidUser, id);
        Set<Tag> tags = resolveTags(note.getUser(), request.tagIds());

        note.setTitle(request.title());
        if (request.checklistMode()) {
            note.setContent("");
            note.setContentJson(toJson(request.checklistItems()));
        } else {
            note.setContent(request.content());
            note.setContentJson(null);
        }
        note.setChecklistMode(request.checklistMode());
        note.setRememberAt(request.rememberAt());
        note.setPinned(request.isPinned());
        note.setArchived(request.isArchived());
        note.setTags(tags);

        return toResponse(noteRepository.save(note));
    }

    @Transactional
    public void delete(String uuidUser, Long id) {
        Note note = findUserNote(uuidUser, id);
        noteRepository.delete(note);
    }

    private User findActiveUser(String uuidUser) {
        User user = userRepository.findByUuidUser(uuidUser)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }
        return user;
    }

    private Note findUserNote(String uuidUser, Long id) {
        User user = findActiveUser(uuidUser);
        return noteRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new UsernameNotFoundException("Nota no encontrada"));
    }

    private Set<Tag> resolveTags(User user, Set<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return new HashSet<>();
        }
        Set<Tag> tags = new HashSet<>(tagRepository.findAllById(tagIds));
        if (tags.stream().anyMatch(tag -> !tag.getUser().getId().equals(user.getId()))) {
            throw new IllegalArgumentException("Uno o más tags no pertenecen al usuario");
        }
        return tags;
    }

    private String toJson(Map<String, Boolean> checklistItems) {
        if (checklistItems == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(checklistItems);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Formato de checklist inválido");
        }
    }

    private Map<String, Boolean> fromJson(String contentJson) {
        if (contentJson == null || contentJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(contentJson, new TypeReference<Map<String, Boolean>>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    private NoteResponse toResponse(Note note) {
        return new NoteResponse(
            note.getId(),
            note.getTitle(),
            note.getContent(),
            note.isChecklistMode(),
            note.isChecklistMode() ? fromJson(note.getContentJson()) : null,
            note.getRememberAt(),
            note.isPinned(),
            note.isArchived(),
            note.getPosition(),
            note.getTags().stream().map(Tag::getTagName).collect(Collectors.toSet()),
            note.getCreatedAt(),
            note.getUpdatedAt()
        );
    }
}
