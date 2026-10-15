package fcs.memora.admin;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserRole;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class TagOwnerResolver {

    private final UserRepository userRepository;

    public TagOwnerResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Optional<User> catalogOwner() {
        return userRepository.findFirstByRoleOrderByIdAsc(UserRole.ADMIN);
    }
}
