package fcs.memora.note;

import fcs.memora.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findByUserOrderByPositionDesc(User user);

    Optional<Note> findByIdAndUser(Long id, User user);

    long countByUser(User user);
}
