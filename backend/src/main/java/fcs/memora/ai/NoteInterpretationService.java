package fcs.memora.ai;

import fcs.memora.ai.dto.NoteDraftResponse;
import fcs.memora.ai.dto.NoteInterpretationRequest;
import fcs.memora.ai.dto.NoteInterpretationResponse;
import fcs.memora.note.TagService;
import fcs.memora.note.dto.TagResponse;
import fcs.memora.user.User;
import fcs.memora.user.UserRepository;
import fcs.memora.user.UserStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

@Service
public class NoteInterpretationService {

    private final UserRepository userRepository;
    private final AiProperties properties;
    private final AiConsentService aiConsentService;
    private final AiUsageService aiUsageService;
    private final TagService tagService;
    private final ObjectProvider<NoteDraftExtractor> extractorProvider;
    private final NoteDraftNormalizer normalizer;
    private final Clock clock;
    private final NoteScopeGuard scopeGuard = new NoteScopeGuard();

    public NoteInterpretationService(UserRepository userRepository, AiProperties properties,
                                     AiConsentService aiConsentService, AiUsageService aiUsageService,
                                     TagService tagService, ObjectProvider<NoteDraftExtractor> extractorProvider,
                                     NoteDraftNormalizer normalizer, Clock clock) {
        this.userRepository = userRepository;
        this.properties = properties;
        this.aiConsentService = aiConsentService;
        this.aiUsageService = aiUsageService;
        this.tagService = tagService;
        this.extractorProvider = extractorProvider;
        this.normalizer = normalizer;
        this.clock = clock;
    }

    public NoteInterpretationResponse interpret(String uuidUser, NoteInterpretationRequest request) {
        Instant now = clock.instant();
        User user = findActiveUser(uuidUser);
        if (!properties.enabled()) {
            throw new AiDisabledException();
        }
        if (!aiConsentService.isGranted(user)) {
            throw new AiConsentRequiredException();
        }
        if (!CodePointLimits.isWithin(request.text(), properties.maxInputCodePoints())) {
            throw new IllegalArgumentException("El texto supera el límite permitido");
        }

        scopeGuard.check(request.text());
        aiUsageService.check(user);

        List<TagResponse> tags;
        try {
            tags = tagService.list(uuidUser);
        } catch (RuntimeException ex) {
            throw new TagCatalogUnavailableException();
        }

        NoteDraftExtractor extractor = extractorProvider.getIfAvailable();
        if (extractor == null) {
            throw new AiDisabledException();
        }

        ZoneId zone = parseZone(request.zoneId());
        NoteDraft rawDraft;
        try {
            rawDraft = extractor.extract(request.text().trim(), zone, now, tags);
        } catch (AiTimeoutException | AiProviderException | OutOfScopeException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new AiProviderException("No se pudo interpretar el texto", ex);
        }

        NoteDraft draft = normalizer.normalize(rawDraft, zone, now, tags);

        if (!aiConsentService.isGranted(user)) {
            throw new AiConsentRequiredException();
        }

        aiUsageService.recordSuccess(user);

        NoteDraftResponse responseDraft = draft.multipleIntents() ? null : toResponse(draft);
        return new NoteInterpretationResponse(responseDraft, draft.warnings());
    }

    private User findActiveUser(String uuidUser) {
        User user = userRepository.findByUuidUser(uuidUser)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if (user.getUserStatus() != UserStatus.ACTIVE) {
            throw new DisabledException("Cuenta no activa");
        }
        return user;
    }

    private ZoneId parseZone(String zoneId) {
        if (zoneId == null || zoneId.isBlank()) {
            return null;
        }
        try {
            return ZoneId.of(zoneId.trim());
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private NoteDraftResponse toResponse(NoteDraft draft) {
        return new NoteDraftResponse(
            draft.title(),
            draft.content(),
            draft.checklistMode(),
            draft.checklistItems(),
            draft.rememberAt(),
            draft.tagIds()
        );
    }
}
