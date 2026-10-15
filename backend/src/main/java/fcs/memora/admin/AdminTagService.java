package fcs.memora.admin;

import fcs.memora.admin.dto.GlobalTagResponse;
import fcs.memora.admin.dto.RenameGlobalTagRequest;
import fcs.memora.note.Note;
import fcs.memora.note.NoteRepository;
import fcs.memora.note.Tag;
import fcs.memora.note.TagRepository;
import fcs.memora.note.TagUsageCount;
import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.exception.DuplicateTagException;
import fcs.memora.note.exception.InvalidTagException;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import fcs.memora.user.UserStatus;
import fcs.memora.util.TextNormalizer;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminTagService {

    private final TagRepository tagRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public AdminTagService(TagRepository tagRepository, NoteRepository noteRepository, UserRepository userRepository) {
        this.tagRepository = tagRepository;
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public GlobalTagResponse create(String adminUuid, CreateTagRequest request) {
        User admin = findActiveAdmin(adminUuid);
        String name = normalizeAndValidate(request.tagName());

        if (tagRepository.existsByUserAndTagNameIgnoreCase(admin, name)) {
            throw new DuplicateTagException("Ya existe una etiqueta global con ese nombre");
        }

        Tag global = tagRepository.save(Tag.builder().user(admin).tagName(name).build());
        fuseCollidingPrivates(global, tagRepository.findByTagNameAndUserNot(name, admin));
        return toResponse(global);
    }

    @Transactional(readOnly = true)
    public List<GlobalTagResponse> list(String adminUuid) {
        User admin = findActiveAdmin(adminUuid);
        List<Tag> globals = tagRepository.findByUserOrderByTagNameAsc(admin);
        if (globals.isEmpty()) {
            return List.of();
        }
        List<Long> ids = globals.stream().map(Tag::getId).toList();
        Map<Long, Long> counts = noteRepository.countNotesByTagIds(ids).stream()
            .collect(Collectors.toMap(TagUsageCount::tagId, TagUsageCount::total));
        return globals.stream()
            .map(tag -> new GlobalTagResponse(tag.getId(), tag.getTagName(), counts.getOrDefault(tag.getId(), 0L)))
            .toList();
    }

    @Transactional
    public GlobalTagResponse rename(String adminUuid, Long id, RenameGlobalTagRequest request) {
        User admin = findActiveAdmin(adminUuid);
        Tag global = findOwnedTag(admin, id);
        String name = normalizeAndValidate(request.tagName());

        if (name.equals(global.getTagName())) {
            return toResponse(global);
        }
        if (tagRepository.existsByUserAndTagNameIgnoreCase(admin, name)) {
            throw new DuplicateTagException("Ya existe una etiqueta global con ese nombre");
        }

        global.setTagName(name);
        tagRepository.saveAndFlush(global);
        fuseCollidingPrivates(global, tagRepository.findByTagNameAndUserNot(name, admin));
        return toResponse(global);
    }

    @Transactional
    public void delete(String adminUuid, Long id) {
        User admin = findActiveAdmin(adminUuid);
        Tag global = findOwnedTag(admin, id);

        List<Note> notes = noteRepository.findByTags_Id(global.getId());
        Map<Long, Tag> privateByOwner = new HashMap<>();
        for (Note note : notes) {
            User owner = note.getUser();
            Tag priv = privateByOwner.computeIfAbsent(owner.getId(), key ->
                tagRepository.findByUserAndTagName(owner, global.getTagName())
                    .orElseGet(() -> tagRepository.save(
                        Tag.builder().user(owner).tagName(global.getTagName()).build())));
            note.getTags().remove(global);
            note.getTags().add(priv);
            noteRepository.saveAndFlush(note);
        }
        tagRepository.delete(global);
    }

    private void fuseCollidingPrivates(Tag global, List<Tag> colliding) {
        for (Tag priv : colliding) {
            if (priv.getId().equals(global.getId())) {
                continue;
            }
            List<Note> notes = noteRepository.findByTags_Id(priv.getId());
            for (Note note : notes) {
                note.getTags().remove(priv);
                note.getTags().add(global);
                noteRepository.saveAndFlush(note);
            }
            tagRepository.delete(priv);
        }
    }

    private GlobalTagResponse toResponse(Tag global) {
        long count = noteRepository.countNotesByTagIds(List.of(global.getId())).stream()
            .mapToLong(TagUsageCount::total)
            .sum();
        return new GlobalTagResponse(global.getId(), global.getTagName(), count);
    }

    private Tag findOwnedTag(User admin, Long id) {
        Tag tag = tagRepository.findById(id)
            .orElseThrow(() -> new UsernameNotFoundException("Etiqueta no encontrada"));
        if (!tag.getUser().getId().equals(admin.getId())) {
            throw new UsernameNotFoundException("Etiqueta no encontrada");
        }
        return tag;
    }

    private String normalizeAndValidate(String rawName) {
        String name = TextNormalizer.normalizeTagName(rawName);
        if (!TextNormalizer.isValidTagName(name, TextNormalizer.TAG_NAME_MAX_LENGTH)) {
            throw new InvalidTagException("El nombre de la etiqueta es inválido");
        }
        return name;
    }

    private User findActiveAdmin(String uuidUser) {
        User user = userRepository.findByUuidUser(uuidUser)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }
        if (user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Se requiere rol de administrador");
        }
        return user;
    }
}
