package fcs.memora.ai;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class SpanishReminderResolverTest {

    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");
    private static final Instant MONDAY = Instant.parse("2026-10-26T09:00:00Z");

    private final SpanishReminderResolver resolver = new SpanishReminderResolver();

    @Test
    void resolvesEsteViernesFromMonday() {
        assertThat(resolve("este viernes a las 11", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T11:00"));
    }

    @Test
    void resolvesManana() {
        assertThat(resolve("mañana a las 18", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-27T18:00"));
    }

    @Test
    void distinguishesEsteFromElWeekday() {
        assertThat(resolve("este lunes a las 8", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-26T08:00"));
        assertThat(resolve("el lunes a las 8", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-11-02T08:00"));
    }

    @Test
    void proximoViernesIsTheNextOccurrence() {
        assertThat(resolve("próximo viernes a las 11", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T11:00"));
    }

    @Test
    void esteViernesOnFridayIsToday() {
        Instant friday = Instant.parse("2026-10-30T09:00:00Z");
        assertThat(resolve("este viernes a las 11", friday))
            .isEqualTo(LocalDateTime.parse("2026-10-30T11:00"));
    }

    @Test
    void proximoViernesOnFridayIsNextWeek() {
        Instant friday = Instant.parse("2026-10-30T09:00:00Z");
        assertThat(resolve("próximo viernes a las 11", friday))
            .isEqualTo(LocalDateTime.parse("2026-11-06T11:00"));
    }

    @Test
    void resolvesInDays() {
        assertThat(resolve("en 3 días a las 9", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-29T09:00"));
    }

    @Test
    void resolvesExplicitDayAndMonth() {
        assertThat(resolve("30/10 a las 11", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T11:00"));
    }

    @Test
    void resolvesTimeVariants() {
        assertThat(resolve("este viernes a las 11:30", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T11:30"));
        assertThat(resolve("este viernes a las 11 y media", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T11:30"));
        assertThat(resolve("este viernes a las 6 de la tarde", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T18:00"));
    }

    @Test
    void acceptsPastDateWithCompleteTime() {
        assertThat(resolve("ayer a las 10", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-25T10:00"));
    }

    @Test
    void acceptsIsoFallback() {
        assertThat(resolve("2026-10-30T11:00", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T11:00"));
    }

    @Test
    void resolvesDateOnlyAtMidnight() {
        assertThat(resolve("este viernes", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T00:00"));
        assertThat(resolve("mañana", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-27T00:00"));
        assertThat(resolve("ayer", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-25T00:00"));
    }

    @Test
    void resolvesElViernesWithoutTimeAtMidnight() {
        assertThat(resolve("el viernes debo ir a mercadona", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-10-30T00:00"));
    }

    @Test
    void resolvesQuincenaAsFifteenthAtMidnight() {
        assertThat(resolve("en quincena de noviembre es santo de jorge", MONDAY))
            .isEqualTo(LocalDateTime.parse("2026-11-15T00:00"));
    }

    @Test
    void stillRequiresADate() {
        assertThat(resolve("a las 11", MONDAY)).isNull();
        assertThat(resolve("texto sin fecha", MONDAY)).isNull();
    }

    private LocalDateTime resolve(String expression, Instant now) {
        return resolver.resolve(expression, MADRID, now);
    }
}
