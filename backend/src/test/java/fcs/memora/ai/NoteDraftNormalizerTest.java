package fcs.memora.ai;

import fcs.memora.note.dto.TagResponse;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class NoteDraftNormalizerTest {

    private final NoteDraftNormalizer normalizer = new NoteDraftNormalizer();
    private final Instant now = Instant.parse("2026-10-26T12:00:00Z");
    private final ZoneId zone = ZoneId.of("America/Argentina/Buenos_Aires");
    private static final String CONTENT_TITLE = "Contenido generado por IA · 26/10/2026 09:00";
    private static final String REMINDER_TITLE = "Recordatorio interpretado por IA · 26/10/2026 09:00";
    private static final String LIST_TITLE = "Lista generada por IA · 26/10/2026 09:00";

    @Test
    void generatesContentTitleAndCleansFields() {
        NoteDraft draft = draft("   ", "  contenido  ", false, List.of(), null, List.of(), false);

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(CONTENT_TITLE);
        assertThat(result.content()).isEqualTo("contenido");
        assertThat(result.warnings()).isEmpty();
    }

    @Test
    void truncatesContentInCodePointsAndIgnoresModelTitle() {
        String title = "😀".repeat(201);
        String content = "😀".repeat(2501);
        NoteDraft draft = draft(title, content, false, List.of(), null, List.of(), false);

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(CONTENT_TITLE);
        assertThat(CodePointLimits.count(result.content())).isEqualTo(2500);
        assertThat(result.warnings()).contains(AiWarningCode.CONTENT_TRUNCATED);
    }

    @Test
    void reminderTitleWinsOverChecklist() {
        NoteDraft draft = draft(
            null, "", true,
            List.of(new NoteDraftChecklistItem("leche", false)),
            "este viernes a las 11", List.of(), false
        );

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(REMINDER_TITLE);
        assertThat(result.checklistMode()).isTrue();
    }

    @Test
    void validChecklistWinsAndClearsContent() {
        NoteDraft draft = draft(
            "Compras",
            "contenido",
            true,
            List.of(new NoteDraftChecklistItem("leche", false)),
            null,
            List.of(),
            false
        );

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(LIST_TITLE);
        assertThat(result.checklistMode()).isTrue();
        assertThat(result.checklistItems()).hasSize(1);
        assertThat(result.content()).isEmpty();
    }

    @Test
    void invalidChecklistIsDiscardedAndContentIsKept() {
        NoteDraft draft = draft("Compras", "contenido", true, List.of(), null, List.of(), false);

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(CONTENT_TITLE);
        assertThat(result.checklistMode()).isFalse();
        assertThat(result.checklistItems()).isEmpty();
        assertThat(result.content()).isEqualTo("contenido");
        assertThat(result.warnings()).contains(AiWarningCode.CHECKLIST_DISCARDED);
    }

    @Test
    void keepsGlobalTagAndLimitsToFive() {
        List<TagResponse> tags = List.of(
            new TagResponse(1L, "Casa", false, 0),
            new TagResponse(2L, " casa ", true, 0),
            new TagResponse(3L, "trabajo", false, 0),
            new TagResponse(4L, "compras", false, 0),
            new TagResponse(5L, "salud", false, 0),
            new TagResponse(6L, "viaje", false, 0)
        );
        NoteDraft draft = draft(
            "Título", "contenido", false, List.of(), null,
            List.of(1L, 2L, 3L, 4L, 5L, 6L, 99L), false
        );

        NoteDraft result = normalizer.normalize(draft, zone, now, tags);

        assertThat(result.tagIds()).containsExactly(2L, 3L, 4L, 5L, 6L);
        assertThat(result.warnings()).contains(AiWarningCode.TAGS_DISCARDED);
    }

    @Test
    void resolvesRelativeDateExpressionOnServer() {
        NoteDraft draft = draft(
            "Mercadona", "", false, List.of(), "este viernes a las 11", List.of(), false
        );

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(REMINDER_TITLE);
        assertThat(result.rememberAt()).isEqualTo(LocalDateTime.parse("2026-10-30T11:00"));
    }

    @Test
    void resolvesOnlyCompleteDatesInIanaZones() {
        NoteDraft draft = draft(
            "Reunión", "", false, List.of(), "2026-10-27T18:00", List.of(), false
        );

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(REMINDER_TITLE);
        assertThat(result.rememberAt()).isEqualTo(LocalDateTime.parse("2026-10-27T18:00"));
        assertThat(result.warnings()).isEmpty();
    }

    @Test
    void resolvesDateOnlyAtMidnightAndRejectsTimeOnly() {
        NoteDraft dateOnly = draft(
            "Reunión", "", false, List.of(), "2026-10-27", List.of(), false
        );
        NoteDraft timeOnly = draft(
            "Reunión", "", false, List.of(), "18:00", List.of(), false
        );

        NoteDraft dateOnlyResult = normalizer.normalize(dateOnly, zone, now, List.of());
        NoteDraft timeOnlyResult = normalizer.normalize(timeOnly, zone, now, List.of());
        assertThat(dateOnlyResult.title()).isEqualTo(REMINDER_TITLE);
        assertThat(dateOnlyResult.rememberAt()).isEqualTo(LocalDateTime.parse("2026-10-27T00:00"));
        assertThat(timeOnlyResult.title()).isEqualTo(CONTENT_TITLE);
        assertThat(timeOnlyResult.rememberAt()).isNull();
    }

    @Test
    void rejectsOffsetZones() {
        NoteDraft draft = draft(
            "Reunión", "", false, List.of(), "2026-10-27T18:00", List.of(), false
        );

        NoteDraft result = normalizer.normalize(draft, ZoneId.of("+03:00"), now, List.of()
        );

        assertThat(result.rememberAt()).isNull();
        assertThat(result.warnings()).contains(AiWarningCode.REMINDER_ZONE_INVALID);
    }

    @Test
    void rejectsDstGap() {
        NoteDraft draft = draft(
            "Reunión", "", false, List.of(), "2026-03-08T02:30", List.of(), false
        );

        NoteDraft result = normalizer.normalize(draft, ZoneId.of("America/New_York"), now, List.of()
        );

        assertThat(result.rememberAt()).isNull();
        assertThat(result.warnings()).contains(AiWarningCode.REMINDER_AMBIGUOUS);
    }

    @Test
    void acceptsPastCompleteDates() {
        NoteDraft draft = draft(
            "Reunión", "", false, List.of(), "2020-01-01T10:00", List.of(), false
        );

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());
        assertThat(result.title()).isEqualTo(REMINDER_TITLE);
        assertThat(result.rememberAt()).isEqualTo(LocalDateTime.parse("2020-01-01T10:00"));
    }

    @Test
    void marksMultipleIntents() {
        NoteDraft draft = draft("Título", "contenido", false, List.of(), null, List.of(), true);

        NoteDraft result = normalizer.normalize(draft, zone, now, List.of());

        assertThat(result.title()).isEqualTo(CONTENT_TITLE);
        assertThat(result.multipleIntents()).isTrue();
        assertThat(result.warnings()).contains(AiWarningCode.MULTIPLE_INTENTS);
    }

    private NoteDraft draft(String title, String content, boolean checklistMode,
                            List<NoteDraftChecklistItem> items, String rememberAt,
                            List<Long> tagIds, boolean multipleIntents) {
        return new NoteDraft(
            title, content, checklistMode, items, rememberAt, null, tagIds, multipleIntents, List.of()
        );
    }
}
