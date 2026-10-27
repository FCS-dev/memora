package fcs.memora.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiConsentRepository extends JpaRepository<AiConsentEvent, Long> {

    Optional<AiConsentEvent> findTopByUserIdOrderByIdDesc(Long userId);

    long countByUserId(Long userId);
}
