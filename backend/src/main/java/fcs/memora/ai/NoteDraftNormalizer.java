package fcs.memora.ai;

import fcs.memora.note.dto.TagResponse;
import fcs.memora.util.TextNormalizer;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class NoteDraftNormalizer {

    private final SpanishReminderResolver reminderResolver = new SpanishReminderResolver();

    private static final int TITLE_MAX = 200;
    private static final int CONTENT_MAX = 2500;
    private static final DateTimeFormatter TITLE_FORMAT = DateTimeFormatter.ofPattern(
        "dd/MM/yyyy HH:mm", Locale.forLanguageTag("es-ES")
    );
    private static final int CHECKLIST_MAX = 2500;
    private static final int MAX_TAGS = 5;

    public NoteDraft normalize(NoteDraft draft, ZoneId zone, Instant now,
                               List<TagResponse> allowedTags) {
        List<AiWarningCode> warnings = new ArrayList<>();

        String content = clean(draft.content());
        if (CodePointLimits.count(content) > CONTENT_MAX) {
            content = CodePointLimits.truncate(content, CONTENT_MAX);
            addWarning(warnings, AiWarningCode.CONTENT_TRUNCATED);
        }

        List<NoteDraftChecklistItem> checklistItems = normalizeChecklist(draft, warnings);
        boolean checklistMode = !checklistItems.isEmpty();
        if (checklistMode) {
            content = "";
        }

        List<Long> tagIds = normalizeTags(draft.tagIds(), allowedTags, warnings);
        LocalDateTime rememberAt = resolveReminder(
            draft.rememberAtExpression(), zone, now, warnings
        );

        if (draft.multipleIntents()) {
            addWarning(warnings, AiWarningCode.MULTIPLE_INTENTS);
        }

        String title = CodePointLimits.truncate(
            generatedTitle(checklistMode, rememberAt, now, zone), TITLE_MAX
        );

        return new NoteDraft(
            title,
            content,
            checklistMode,
            checklistItems,
            draft.rememberAtExpression(),
            rememberAt,
            tagIds,
            draft.multipleIntents(),
            List.copyOf(warnings)
        );
    }

    private String generatedTitle(boolean checklistMode, LocalDateTime rememberAt,
                                  Instant now, ZoneId zone) {
        ZoneId effectiveZone = isIanaZone(zone) ? zone : ZoneId.systemDefault();
        String timestamp = ZonedDateTime.ofInstant(now, effectiveZone).format(TITLE_FORMAT);
        String prefix = rememberAt != null
            ? "Recordatorio interpretado por IA"
            : checklistMode
                ? "Lista generada por IA"
                : "Contenido generado por IA";
        return prefix + " · " + timestamp;
    }

    private List<NoteDraftChecklistItem> normalizeChecklist(NoteDraft draft,
                                                            List<AiWarningCode> warnings) {
        if (!draft.checklistMode() && draft.checklistItems().isEmpty()) {
            return List.of();
        }
        if (!draft.checklistMode() || draft.checklistItems().isEmpty()) {
            addWarning(warnings, AiWarningCode.CHECKLIST_DISCARDED);
            return List.of();
        }

        List<NoteDraftChecklistItem> valid = new ArrayList<>();
        int total = 0;
        for (NoteDraftChecklistItem item : draft.checklistItems()) {
            if (item == null || item.text() == null || item.text().isBlank()) {
                addWarning(warnings, AiWarningCode.CHECKLIST_DISCARDED);
                return List.of();
            }
            String text = item.text().trim();
            total += CodePointLimits.count(text);
            if (total > CHECKLIST_MAX) {
                addWarning(warnings, AiWarningCode.CHECKLIST_DISCARDED);
                return List.of();
            }
            valid.add(new NoteDraftChecklistItem(text, item.checked()));
        }
        return List.copyOf(valid);
    }

    private List<Long> normalizeTags(List<Long> requested, List<TagResponse> allowedTags,
                                     List<AiWarningCode> warnings) {
        if (requested == null || requested.isEmpty()) {
            return List.of();
        }

        Map<Long, TagResponse> allowedById = new LinkedHashMap<>();
        for (TagResponse tag : allowedTags) {
            allowedById.put(tag.id(), tag);
        }

        Map<String, TagResponse> selectedByName = new LinkedHashMap<>();
        boolean discarded = false;
        for (Long id : requested) {
            TagResponse tag = allowedById.get(id);
            if (tag == null) {
                discarded = true;
                continue;
            }
            String name = TextNormalizer.normalizeTagName(tag.tagName());
            TagResponse existing = selectedByName.get(name);
            if (existing == null) {
                if (selectedByName.size() >= MAX_TAGS) {
                    discarded = true;
                } else {
                    selectedByName.put(name, tag);
                }
            } else if (!existing.global() && tag.global()) {
                selectedByName.put(name, tag);
                discarded = true;
            } else {
                discarded = true;
            }
        }

        if (discarded || selectedByName.size() != requested.size()) {
            addWarning(warnings, AiWarningCode.TAGS_DISCARDED);
        }
        return selectedByName.values().stream().map(TagResponse::id).toList();
    }

    private LocalDateTime resolveReminder(String expression, ZoneId zone, Instant now,
                                          List<AiWarningCode> warnings) {
        if (expression == null || expression.isBlank()) {
            return null;
        }
        if (!isIanaZone(zone)) {
            addWarning(warnings, AiWarningCode.REMINDER_ZONE_INVALID);
            return null;
        }
        LocalDateTime candidate = reminderResolver.resolve(expression, zone, now);
        if (candidate == null) {
            addWarning(warnings, AiWarningCode.REMINDER_AMBIGUOUS);
            return null;
        }
        List<ZoneOffset> offsets = zone.getRules().getValidOffsets(candidate);
        if (offsets.isEmpty() || offsets.size() > 1) {
            addWarning(warnings, AiWarningCode.REMINDER_AMBIGUOUS);
            return null;
        }
        return candidate;
    }

    private boolean isIanaZone(ZoneId zone) {
        return zone != null && ZoneId.getAvailableZoneIds().contains(zone.getId());
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private void addWarning(List<AiWarningCode> warnings, AiWarningCode warning) {
        if (!warnings.contains(warning)) {
            warnings.add(warning);
        }
    }
}
