package fcs.memora.note;

import fcs.memora.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {

    List<Tag> findByUserOrderByTagNameAsc(User user);

    Optional<Tag> findByUserAndTagNameIgnoreCase(User user, String tagName);

    boolean existsByUserAndTagNameIgnoreCase(User user, String tagName);
}
