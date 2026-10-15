package fcs.memora.note;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.admin.TagOwnerResolver;
import fcs.memora.note.dto.ChangeNoteGroupRequest;
import fcs.memora.note.dto.ChecklistItem;
import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.NoteResponse;
import fcs.memora.note.dto.ReorderNoteRequest;
import fcs.memora.note.dto.UpdateNoteRequest;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserStatus;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NoteService {

    private static final long STEP = 100_000L;
    private static final int UUID_MAX_ATTEMPTS = 5;

    private final NoteRepository noteRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final TagOwnerResolver tagOwnerResolver;
    private final ObjectMapper objectMapper;

    public NoteService(NoteRepository noteRepository, TagRepository tagRepository, UserRepository userRepository,
                       TagOwnerResolver tagOwnerResolver) {
        this.noteRepository = noteRepository;
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
        this.tagOwnerResolver = tagOwnerResolver;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public NoteResponse create(String uuidUser, CreateNoteRequest request) {
        if (request.isArchived()) {
            throw new IllegalArgumentException("No se puede crear una nota archivada");
        }

        User user = findActiveUser(uuidUser);
        Set<Tag> tags = resolveTags(user, request.tagIds());

        boolean pinned = request.isPinned();
        long maxPosition = noteRepository.maxPosition(user, pinned, false).orElse(0L);

        Note note = Note.builder()
            .uuidNote(generateUniqueUuid())
            .user(user)
            .title(request.title())
            .content(request.checklistMode() ? "" : request.content())
            .contentJson(request.checklistMode() ? toJson(request.checklistItems()) : null)
            .checklistMode(request.checklistMode())
            .rememberAt(request.rememberAt())
            .isPinned(pinned)
            .isArchived(false)
            .position(maxPosition + STEP)
            .tags(tags)
            .build();

        return toResponse(noteRepository.saveAndFlush(note));
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> list(String uuidUser) {
        User user = findActiveUser(uuidUser);
        return noteRepository.findByUserAndIsArchivedFalseOrderByIsPinnedDescPositionDescIdDesc(user).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> listArchived(String uuidUser) {
        User user = findActiveUser(uuidUser);
        return noteRepository.findByUserAndIsArchivedTrueOrderByCreatedAtDescIdDesc(user).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public NoteResponse getByUuid(String uuidUser, String uuidNote) {
        User user = findActiveUser(uuidUser);
        return toResponse(findUserNote(user, uuidNote));
    }

    @Transactional
    public NoteResponse update(String uuidUser, String uuidNote, UpdateNoteRequest request) {
        User user = findActiveUser(uuidUser);
        Note note = findUserNote(user, uuidNote);
        Set<Tag> tags = resolveTags(user, request.tagIds());

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
        note.setTags(tags);

        if (request.isPinned() != null && (note.isArchived() || note.isPinned() != request.isPinned())) {
            boolean pinned = request.isPinned();
            long maxPosition = noteRepository.maxPosition(user, pinned, false).orElse(0L);
            note.setArchived(false);
            note.setPinned(pinned);
            note.setPosition(maxPosition + STEP);
        }

        return toResponse(noteRepository.saveAndFlush(note));
    }

    @Transactional
    public NoteResponse reorder(String uuidUser, String uuidNote, ReorderNoteRequest request) {
        User user = findActiveUser(uuidUser);
        Note note = findUserNote(user, uuidNote);

        NoteGroup group = NoteGroup.resolve(note.isPinned(), note.isArchived());
        if (group == NoteGroup.ARCHIVED) {
            throw new IllegalArgumentException("No se pueden reordenar notas archivadas");
        }

        Note before = resolveNeighbor(user, request.beforeUuid());
        Note after = resolveNeighbor(user, request.afterUuid());

        validateNeighbor(before, note, group);
        validateNeighbor(after, note, group);
        if (before != null && after != null && before.getId().equals(after.getId())) {
            throw new IllegalArgumentException("Las vecinas anterior y siguiente no pueden ser la misma nota");
        }

        List<Note> groupNotes = noteRepository
            .findByUserAndIsPinnedAndIsArchivedOrderByPositionDescIdDesc(user, note.isPinned(), false);
        groupNotes.removeIf(candidate -> candidate.getId().equals(note.getId()));

        Long upper = before != null ? before.getPosition() : null;
        Long lower = after != null ? after.getPosition() : null;
        long candidate = NotePositioner.resolvePosition(upper, lower, STEP);

        if (NotePositioner.needsRebalance(candidate, upper, lower)) {
            List<Long> positions = NotePositioner.rebalancedPositions(groupNotes.size(), STEP);
            for (int i = 0; i < groupNotes.size(); i++) {
                groupNotes.get(i).setPosition(positions.get(i));
            }
            noteRepository.saveAllAndFlush(groupNotes);
            upper = before != null ? before.getPosition() : null;
            lower = after != null ? after.getPosition() : null;
            candidate = NotePositioner.resolvePosition(upper, lower, STEP);
        }

        note.setPosition(candidate);
        return toResponse(noteRepository.saveAndFlush(note));
    }

    @Transactional
    public NoteResponse changeGroup(String uuidUser, String uuidNote, ChangeNoteGroupRequest request) {
        User user = findActiveUser(uuidUser);
        Note note = findUserNote(user, uuidNote);

        NoteGroup current = NoteGroup.resolve(note.isPinned(), note.isArchived());
        NoteGroup target = request.group();
        if (target == current) {
            throw new IllegalArgumentException("La nota ya pertenece al grupo destino");
        }

        if (target == NoteGroup.ARCHIVED) {
            note.setArchived(true);
            note.setPinned(false);
        } else {
            boolean pinned = target == NoteGroup.PINNED;
            long maxPosition = noteRepository.maxPosition(user, pinned, false).orElse(0L);
            note.setArchived(false);
            note.setPinned(pinned);
            note.setPosition(maxPosition + STEP);
        }

        return toResponse(noteRepository.saveAndFlush(note));
    }

    @Transactional
    public NoteResponse updateChecklistItem(String uuidUser, String uuidNote, String item, boolean checked) {
        User user = findActiveUser(uuidUser);
        Note note = findUserNote(user, uuidNote);

        if (!note.isChecklistMode()) {
            throw new IllegalArgumentException("La nota no es una checklist");
        }

        List<ChecklistItem> items = new ArrayList<>(fromJson(note.getContentJson()));
        int index = -1;
        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).text().equals(item)) {
                index = i;
                break;
            }
        }
        if (index < 0) {
            throw new UsernameNotFoundException("Ítem no encontrado");
        }

        items.set(index, new ChecklistItem(item, checked));
        note.setContentJson(toJson(items));
        return toResponse(noteRepository.saveAndFlush(note));
    }

    @Transactional
    public void delete(String uuidUser, String uuidNote) {
        User user = findActiveUser(uuidUser);
        noteRepository.delete(findUserNote(user, uuidNote));
    }

    private User findActiveUser(String uuidUser) {
        User user = userRepository.findByUuidUser(uuidUser)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }
        return user;
    }

    private Note findUserNote(User user, String uuidNote) {
        if (!NotePositioner.isValidUuid(uuidNote)) {
            throw new IllegalArgumentException("Identificador de nota inválido");
        }
        return noteRepository.findByUuidNoteAndUser(uuidNote, user)
            .orElseThrow(() -> new UsernameNotFoundException("Nota no encontrada"));
    }

    private Note resolveNeighbor(User user, String uuid) {
        if (uuid == null || uuid.isBlank()) {
            return null;
        }
        if (!NotePositioner.isValidUuid(uuid)) {
            throw new IllegalArgumentException("Identificador de vecina inválido");
        }
        return noteRepository.findByUuidNoteAndUser(uuid, user)
            .orElseThrow(() -> new UsernameNotFoundException("Nota no encontrada"));
    }

    private void validateNeighbor(Note neighbor, Note note, NoteGroup group) {
        if (neighbor == null) {
            return;
        }
        if (neighbor.getId().equals(note.getId())) {
            throw new IllegalArgumentException("La vecina no puede ser la propia nota");
        }
        if (NoteGroup.resolve(neighbor.isPinned(), neighbor.isArchived()) != group) {
            throw new IllegalArgumentException("La vecina no pertenece al grupo de la nota");
        }
    }

    private String generateUniqueUuid() {
        for (int attempt = 0; attempt < UUID_MAX_ATTEMPTS; attempt++) {
            String uuid = UUID.randomUUID().toString();
            if (!noteRepository.existsByUuidNote(uuid)) {
                return uuid;
            }
        }
        throw new IllegalStateException("No se pudo generar un identificador único");
    }

    private Set<Tag> resolveTags(User user, Set<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return new HashSet<>();
        }
        Set<Tag> tags = new HashSet<>(tagRepository.findAllById(tagIds));
        Long ownerId = tagOwnerResolver.catalogOwner().map(owner -> owner.getId()).orElse(null);
        boolean hasForeignTag = tags.stream().anyMatch(tag ->
            !tag.getUser().getId().equals(user.getId())
                && (ownerId == null || !tag.getUser().getId().equals(ownerId)));
        if (hasForeignTag) {
            throw new IllegalArgumentException("Uno o más tags no pertenecen al usuario");
        }
        return tags;
    }

    private String toJson(List<ChecklistItem> checklistItems) {
        if (checklistItems == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(checklistItems);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Formato de checklist inválido");
        }
    }

    private List<ChecklistItem> fromJson(String contentJson) {
        if (contentJson == null || contentJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(contentJson, new TypeReference<List<ChecklistItem>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private NoteResponse toResponse(Note note) {
        return new NoteResponse(
            note.getUuidNote(),
            note.getTitle(),
            note.getContent(),
            note.isChecklistMode(),
            note.isChecklistMode() ? fromJson(note.getContentJson()) : null,
            note.getRememberAt(),
            note.isPinned(),
            note.isArchived(),
            note.getTags().stream().map(Tag::getTagName).collect(Collectors.toSet()),
            note.getCreatedAt(),
            note.getUpdatedAt()
        );
    }
}
