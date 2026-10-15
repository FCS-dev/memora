package fcs.memora.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUuidUser(String uuidUser);

    boolean existsByEmail(String email);

    long countByRole(UserRole role);

    Optional<User> findFirstByRoleOrderByIdAsc(UserRole role);
}
