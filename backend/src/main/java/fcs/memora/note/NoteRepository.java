package fcs.memora.note;

import fcs.memora.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    Optional<Note> findByUuidNoteAndUser(String uuidNote, User user);

    Optional<Note> findByUserAndIdempotencyKey(User user, String idempotencyKey);

    boolean existsByUuidNote(String uuidNote);

    List<Note> findByUserAndIsArchivedFalseOrderByIsPinnedDescPositionDescIdDesc(User user);

    List<Note> findByUserAndIsArchivedTrueOrderByCreatedAtDescIdDesc(User user);

    List<Note> findByUserAndIsPinnedAndIsArchivedOrderByPositionDescIdDesc(User user, boolean isPinned, boolean isArchived);

    List<Note> findByTags_Id(Long tagId);

    @Query("select max(n.position) from Note n where n.user = :user and n.isPinned = :isPinned and n.isArchived = :isArchived")
    Optional<Long> maxPosition(@Param("user") User user, @Param("isPinned") boolean isPinned, @Param("isArchived") boolean isArchived);

    @Query("select new fcs.memora.note.TagUsageCount(t.id, count(distinct n)) "
        + "from Note n join n.tags t where t.id in :ids group by t.id")
    List<TagUsageCount> countNotesByTagIds(@Param("ids") Collection<Long> ids);

    @Query("select new fcs.memora.note.TagUsageCount(t.id, count(distinct n)) "
        + "from Note n join n.tags t where t.id in :ids and n.user = :user group by t.id")
    List<TagUsageCount> countNotesByTagIdsAndUser(@Param("ids") Collection<Long> ids, @Param("user") User user);

    long countByUser(User user);
}
