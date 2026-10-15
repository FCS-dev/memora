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

    Optional<Tag> findByUserAndTagName(User user, String tagName);

    List<Tag> findByTagName(String tagName);

    List<Tag> findByTagNameAndUserNot(String tagName, User user);
}
