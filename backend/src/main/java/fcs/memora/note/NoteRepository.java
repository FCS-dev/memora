package fcs.memora.note;

import fcs.memora.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    Optional<Note> findByUuidNoteAndUser(String uuidNote, User user);

    boolean existsByUuidNote(String uuidNote);

    List<Note> findByUserAndIsArchivedFalseOrderByIsPinnedDescPositionDescIdDesc(User user);

    List<Note> findByUserAndIsArchivedTrueOrderByCreatedAtDescIdDesc(User user);

    List<Note> findByUserAndIsPinnedAndIsArchivedOrderByPositionDescIdDesc(User user, boolean isPinned, boolean isArchived);

    @Query("select max(n.position) from Note n where n.user = :user and n.isPinned = :isPinned and n.isArchived = :isArchived")
    Optional<Long> maxPosition(@Param("user") User user, @Param("isPinned") boolean isPinned, @Param("isArchived") boolean isArchived);

    long countByUser(User user);
}
