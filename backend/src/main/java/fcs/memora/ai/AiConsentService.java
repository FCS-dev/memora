package fcs.memora.ai;

import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserStatus;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AiConsentService {

    private final AiConsentRepository repository;
    private final UserRepository userRepository;
    private final AiProperties properties;

    public AiConsentService(AiConsentRepository repository, UserRepository userRepository,
                            AiProperties properties) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public Optional<AiConsentEvent> latest(User user) {
        if (user.getId() == null) {
            return Optional.empty();
        }
        return repository.findTopByUserIdOrderByIdDesc(user.getId());
    }

    @Transactional(readOnly = true)
    public ConsentState state(User user) {
        return latest(user)
            .map(event -> switch (event.getAction()) {
                case GRANTED -> ConsentState.GRANTED;
                case DENIED -> ConsentState.DENIED;
                case REVOKED -> ConsentState.REVOKED;
            })
            .orElse(ConsentState.NOT_SET);
    }

    @Transactional(readOnly = true)
    public boolean isGranted(User user) {
        return latest(user)
            .map(event -> event.getAction() == AiConsentAction.GRANTED
                && properties.noticeVersion().equals(event.getNoticeVersion()))
            .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean requiresConsent(User user) {
        ConsentState state = state(user);
        return state == ConsentState.NOT_SET
            || (state == ConsentState.GRANTED && !isGranted(user));
    }

    @Transactional
    public void update(String uuidUser, AiConsentAction action, String noticeVersion) {
        User user = userRepository.findByUuidUser(uuidUser)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }
        record(user, action, noticeVersion);
    }

    @Transactional
    public void grant(User user, String noticeVersion) {
        record(user, AiConsentAction.GRANTED, noticeVersion);
    }

    @Transactional
    public void deny(User user, String noticeVersion) {
        record(user, AiConsentAction.DENIED, noticeVersion);
    }

    @Transactional
    public void revoke(User user, String noticeVersion) {
        record(user, AiConsentAction.REVOKED, noticeVersion);
    }

    private void record(User user, AiConsentAction action, String noticeVersion) {
        if (action == null) {
            throw new IllegalArgumentException("La acción de consentimiento es obligatoria");
        }
        if (!properties.noticeVersion().equals(noticeVersion)) {
            throw new IllegalArgumentException("La versión del aviso no es válida");
        }
        repository.save(AiConsentEvent.builder()
            .user(user)
            .action(action)
            .noticeVersion(noticeVersion)
            .build());
    }
}
