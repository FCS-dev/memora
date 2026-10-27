package fcs.memora.ai;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface AiUsageRepository extends JpaRepository<AiUsage, Long> {

    Optional<AiUsage> findByUserIdAndUsageDate(Long userId, LocalDate usageDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AiUsage u where u.user.id = :userId and u.usageDate = :usageDate")
    Optional<AiUsage> findByUserIdAndUsageDateForUpdate(
        @Param("userId") Long userId,
        @Param("usageDate") LocalDate usageDate
    );
}
