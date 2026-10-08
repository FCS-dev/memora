package fcs.memora.note;

import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.TagResponse;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserStatus;
import fcs.memora.util.TextNormalizer;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    public TagService(TagRepository tagRepository, UserRepository userRepository) {
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TagResponse create(String uuidUser, CreateTagRequest request) {
        User user = findActiveUser(uuidUser);
        String normalizedName = TextNormalizer.normalizeTagName(request.tagName());

        if (tagRepository.existsByUserAndTagNameIgnoreCase(user, normalizedName)) {
            throw new IllegalArgumentException("El tag ya existe");
        }

        Tag tag = Tag.builder()
            .user(user)
            .tagName(normalizedName)
            .build();

        Tag saved = tagRepository.save(tag);
        return new TagResponse(saved.getId(), saved.getTagName());
    }

    @Transactional(readOnly = true)
    public List<TagResponse> list(String uuidUser) {
        User user = findActiveUser(uuidUser);
        return tagRepository.findByUserOrderByTagNameAsc(user).stream()
            .map(tag -> new TagResponse(tag.getId(), tag.getTagName()))
            .toList();
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
