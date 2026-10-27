package fcs.memora.ai;

import fcs.memora.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class AiUsageService {

    private final AiUsageRepository repository;
    private final AiProperties properties;
    private final Clock clock;

    public AiUsageService(AiUsageRepository repository, AiProperties properties, Clock clock) {
        this.repository = repository;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public void check(User user) {
        LocalDate today = currentDate();
        repository.findByUserIdAndUsageDate(user.getId(), today)
            .filter(usage -> usage.getCount() >= properties.dailyLimit())
            .ifPresent(usage -> {
                throw new AiQuotaExceededException();
            });
    }

    @Transactional
    public void recordSuccess(User user) {
        LocalDate today = currentDate();
        AiUsage usage = repository.findByUserIdAndUsageDateForUpdate(user.getId(), today)
            .orElseGet(() -> AiUsage.builder()
                .user(user)
                .usageDate(today)
                .count(0)
                .build());
        usage.setCount(usage.getCount() + 1);
        repository.save(usage);
    }

    private LocalDate currentDate() {
        return LocalDate.now(clock.withZone(ZoneId.systemDefault()));
    }
}
