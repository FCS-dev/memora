package fcs.memora.note;

import fcs.memora.admin.TagOwnerResolver;
import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.CreateTagResponse;
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
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final TagOwnerResolver tagOwnerResolver;

    public TagService(TagRepository tagRepository, UserRepository userRepository, TagOwnerResolver tagOwnerResolver) {
        this.tagRepository = tagRepository;
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

        List<TagResponse> globals = List.of();
        if (owner.isPresent() && !owner.get().getId().equals(user.getId())) {
            globals = tagRepository.findByUserOrderByTagNameAsc(owner.get()).stream()
                .map(tag -> new TagResponse(tag.getId(), tag.getTagName(), true))
                .toList();
        }
        Set<String> globalNames = globals.stream()
            .map(TagResponse::tagName)
            .collect(Collectors.toSet());

        List<TagResponse> privates = tagRepository.findByUserOrderByTagNameAsc(user).stream()
            .filter(tag -> !globalNames.contains(tag.getTagName()))
            .map(tag -> new TagResponse(tag.getId(), tag.getTagName(), false))
            .toList();

        List<TagResponse> result = new ArrayList<>(globals);
        result.addAll(privates);
        result.sort(Comparator.comparing(TagResponse::tagName));
        return result;
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
