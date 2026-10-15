package fcs.memora.note;

import fcs.memora.admin.TagOwnerResolver;
import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.CreateTagResponse;
import fcs.memora.note.dto.RenameTagRequest;
import fcs.memora.note.dto.TagResponse;
import fcs.memora.note.exception.DuplicateTagException;
import fcs.memora.note.exception.InvalidTagException;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserStatus;
import fcs.memora.util.TextNormalizer;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final TagOwnerResolver tagOwnerResolver;

    public TagService(TagRepository tagRepository, NoteRepository noteRepository, UserRepository userRepository,
                      TagOwnerResolver tagOwnerResolver) {
        this.tagRepository = tagRepository;
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
        this.tagOwnerResolver = tagOwnerResolver;
    }

    @Transactional
    public CreateTagResponse create(String uuidUser, CreateTagRequest request) {
        User user = findActiveUser(uuidUser);
        String normalizedName = TextNormalizer.normalizeTagName(request.tagName());

        if (!TextNormalizer.isValidTagName(normalizedName, TextNormalizer.TAG_NAME_MAX_LENGTH)) {
            throw new InvalidTagException("El nombre de la etiqueta es inválido");
        }

        Optional<User> owner = tagOwnerResolver.catalogOwner();
        if (owner.isPresent() && !owner.get().getId().equals(user.getId())) {
            Optional<Tag> global = tagRepository.findByUserAndTagName(owner.get(), normalizedName);
            if (global.isPresent()) {
                Tag reused = global.get();
                return new CreateTagResponse(reused.getId(), reused.getTagName(), true, true);
            }
        }

        if (tagRepository.existsByUserAndTagNameIgnoreCase(user, normalizedName)) {
            throw new DuplicateTagException("Ya existe una etiqueta con ese nombre");
        }

        Tag saved = tagRepository.save(Tag.builder()
            .user(user)
            .tagName(normalizedName)
            .build());
        return new CreateTagResponse(saved.getId(), saved.getTagName(), false, false);
    }

    @Transactional(readOnly = true)
    public List<TagResponse> list(String uuidUser) {
        User user = findActiveUser(uuidUser);
        Optional<User> owner = tagOwnerResolver.catalogOwner();

        List<Tag> globalTags = List.of();
        if (owner.isPresent() && !owner.get().getId().equals(user.getId())) {
            globalTags = tagRepository.findByUserOrderByTagNameAsc(owner.get());
        }
        Set<String> globalNames = globalTags.stream()
            .map(Tag::getTagName)
            .collect(Collectors.toSet());

        List<Tag> privateTags = tagRepository.findByUserOrderByTagNameAsc(user).stream()
            .filter(tag -> !globalNames.contains(tag.getTagName()))
            .toList();

        List<Long> ids = new ArrayList<>();
        globalTags.forEach(tag -> ids.add(tag.getId()));
        privateTags.forEach(tag -> ids.add(tag.getId()));
        Map<Long, Long> counts = ids.isEmpty()
            ? Map.of()
            : noteRepository.countNotesByTagIdsAndUser(ids, user).stream()
                .collect(Collectors.toMap(TagUsageCount::tagId, TagUsageCount::total));

        List<TagResponse> result = new ArrayList<>();
        for (Tag tag : globalTags) {
            result.add(new TagResponse(tag.getId(), tag.getTagName(), true, counts.getOrDefault(tag.getId(), 0L)));
        }
        for (Tag tag : privateTags) {
            result.add(new TagResponse(tag.getId(), tag.getTagName(), false, counts.getOrDefault(tag.getId(), 0L)));
        }
        result.sort(Comparator.comparing(TagResponse::tagName));
        return result;
    }

    @Transactional
    public TagResponse rename(String uuidUser, Long id, RenameTagRequest request) {
        User user = findActiveUser(uuidUser);
        Tag tag = findOwnedTag(user, id);
        String name = normalizeAndValidate(request.tagName());

        if (name.equals(tag.getTagName())) {
            return toResponse(tag, user, false);
        }

        Optional<User> owner = tagOwnerResolver.catalogOwner();
        if (owner.isPresent() && !owner.get().getId().equals(user.getId())) {
            Optional<Tag> global = tagRepository.findByUserAndTagName(owner.get(), name);
            if (global.isPresent()) {
                fuseIntoGlobal(global.get(), tag);
                return toResponse(global.get(), user, true);
            }
        }

        if (tagRepository.existsByUserAndTagNameIgnoreCase(user, name)) {
            throw new DuplicateTagException("Ya existe una etiqueta con ese nombre");
        }

        tag.setTagName(name);
        tagRepository.saveAndFlush(tag);
        return toResponse(tag, user, false);
    }

    @Transactional
    public void delete(String uuidUser, Long id) {
        User user = findActiveUser(uuidUser);
        Tag tag = findOwnedTag(user, id);

        for (Note note : noteRepository.findByTags_Id(tag.getId())) {
            note.getTags().remove(tag);
            noteRepository.saveAndFlush(note);
        }
        tagRepository.delete(tag);
    }

    private void fuseIntoGlobal(Tag global, Tag priv) {
        for (Note note : noteRepository.findByTags_Id(priv.getId())) {
            note.getTags().remove(priv);
            note.getTags().add(global);
            noteRepository.saveAndFlush(note);
        }
        tagRepository.delete(priv);
    }

    private TagResponse toResponse(Tag tag, User user, boolean global) {
        long count = noteRepository.countNotesByTagIdsAndUser(List.of(tag.getId()), user).stream()
            .mapToLong(TagUsageCount::total)
            .sum();
        return new TagResponse(tag.getId(), tag.getTagName(), global, count);
    }

    private Tag findOwnedTag(User user, Long id) {
        Tag tag = tagRepository.findById(id)
            .orElseThrow(() -> new UsernameNotFoundException("Etiqueta no encontrada"));
        if (!tag.getUser().getId().equals(user.getId())) {
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

    private User findActiveUser(String uuidUser) {
        User user = userRepository.findByUuidUser(uuidUser)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }
        return user;
    }
}
