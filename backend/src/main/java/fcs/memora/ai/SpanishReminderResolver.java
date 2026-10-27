package fcs.memora.ai;

import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class SpanishReminderResolver {

    private static final Pattern ISO_DATE_TIME = Pattern.compile(
        "(\\d{4})-(\\d{2})-(\\d{2})[t ](\\d{1,2}):(\\d{2})"
    );
    private static final Pattern ISO_DATE = Pattern.compile(
        "(\\d{4})-(\\d{2})-(\\d{2})"
    );
    private static final Pattern SLASH_DATE = Pattern.compile(
        "(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?"
    );
    private static final Pattern DAY_MONTH = Pattern.compile(
        "(\\d{1,2})\\s+de\\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)"
    );
    private static final Pattern QUINCENA = Pattern.compile(
        "quincena\\s+de\\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)"
    );
    private static final Pattern IN_DAYS = Pattern.compile(
        "en\\s+(\\d+)\\s+(dia|dias|semana|semanas)"
    );
    private static final Pattern WEEKDAY = Pattern.compile(
        "(este|esta|el|la|proximo|proxima)?\\s*(lunes|martes|miercoles|jueves|viernes|sabado|domingo)"
    );
    private static final Pattern COLON_TIME = Pattern.compile("(\\d{1,2}):(\\d{2})");
    private static final Pattern A_LAS = Pattern.compile("a\\s+las\\s+(\\d{1,2})(?::(\\d{2}))?");
    private static final Pattern HOUR_SUFFIX = Pattern.compile("(\\d{1,2})\\s*(?:h|hs|horas)\\b");
    private static final Pattern HALF_QUARTER = Pattern.compile(
        "(\\d{1,2})\\s+y\\s+(media|cuarto)"
    );
    private static final Pattern AM_PM = Pattern.compile("(\\d{1,2})\\s*(am|pm)");
    private static final Pattern DAY_PART = Pattern.compile(
        "(\\d{1,2})\\s+de\\s+la\\s+(manana|tarde|noche|madrugada)"
    );

    private static final Map<String, DayOfWeek> WEEKDAYS = Map.of(
        "lunes", DayOfWeek.MONDAY,
        "martes", DayOfWeek.TUESDAY,
        "miercoles", DayOfWeek.WEDNESDAY,
        "jueves", DayOfWeek.THURSDAY,
        "viernes", DayOfWeek.FRIDAY,
        "sabado", DayOfWeek.SATURDAY,
        "domingo", DayOfWeek.SUNDAY
    );

    private static final Map<String, Integer> MONTHS = Map.ofEntries(
        Map.entry("enero", 1),
        Map.entry("febrero", 2),
        Map.entry("marzo", 3),
        Map.entry("abril", 4),
        Map.entry("mayo", 5),
        Map.entry("junio", 6),
        Map.entry("julio", 7),
        Map.entry("agosto", 8),
        Map.entry("septiembre", 9),
        Map.entry("octubre", 10),
        Map.entry("noviembre", 11),
        Map.entry("diciembre", 12)
    );

    public LocalDateTime resolve(String expression, ZoneId zone, Instant now) {
        if (expression == null || expression.isBlank() || zone == null) {
            return null;
        }
        String normalized = normalize(expression);
        Matcher iso = ISO_DATE_TIME.matcher(normalized);
        if (iso.find()) {
            return parseDateTime(
                Integer.parseInt(iso.group(1)), Integer.parseInt(iso.group(2)),
                Integer.parseInt(iso.group(3)), Integer.parseInt(iso.group(4)),
                Integer.parseInt(iso.group(5)), 0
            );
        }

        LocalDate date = resolveDate(normalized, zone, now);
        if (date == null) {
            return null;
        }
        LocalTime time = resolveTime(normalized);
        return LocalDateTime.of(date, time == null ? LocalTime.MIDNIGHT : time);
    }

    private LocalDate resolveDate(String expression, ZoneId zone, Instant now) {
        LocalDate base = LocalDate.ofInstant(now, zone);

        if (expression.contains("pasado manana")) {
            return base.plusDays(2);
        }
        if (expression.contains("manana")) {
            return base.plusDays(1);
        }
        if (expression.contains("anteayer")) {
            return base.minusDays(2);
        }
        if (expression.contains("ayer")) {
            return base.minusDays(1);
        }
        if (expression.contains("hoy")) {
            return base;
        }

        Matcher inDays = IN_DAYS.matcher(expression);
        if (inDays.find()) {
            int amount = Integer.parseInt(inDays.group(1));
            return inDays.group(2).startsWith("semana")
                ? base.plusWeeks(amount)
                : base.plusDays(amount);
        }

        Matcher weekday = WEEKDAY.matcher(expression);
        if (weekday.find()) {
            DayOfWeek day = WEEKDAYS.get(weekday.group(2));
            if (day != null) {
                String modifier = weekday.group(1);
                boolean includeToday = "este".equals(modifier) || "esta".equals(modifier);
                return includeToday
                    ? base.with(TemporalAdjusters.nextOrSame(day))
                    : base.with(TemporalAdjusters.next(day));
            }
        }

        Matcher isoDate = ISO_DATE.matcher(expression);
        if (isoDate.find()) {
            return safeDate(
                Integer.parseInt(isoDate.group(1)),
                Integer.parseInt(isoDate.group(2)),
                Integer.parseInt(isoDate.group(3))
            );
        }

        Matcher slash = SLASH_DATE.matcher(expression);
        if (slash.find()) {
            int day = Integer.parseInt(slash.group(1));
            int month = Integer.parseInt(slash.group(2));
            int year = slash.group(3) == null
                ? base.getYear()
                : Integer.parseInt(slash.group(3).length() == 2 ? "20" + slash.group(3) : slash.group(3));
            return safeDate(year, month, day);
        }

        Matcher quincena = QUINCENA.matcher(expression);
        if (quincena.find()) {
            Integer month = MONTHS.get(quincena.group(1));
            return month == null ? null : safeDate(base.getYear(), month, 15);
        }

        Matcher dayMonth = DAY_MONTH.matcher(expression);
        if (dayMonth.find()) {
            int day = Integer.parseInt(dayMonth.group(1));
            Integer month = MONTHS.get(dayMonth.group(2));
            return month == null ? null : safeDate(base.getYear(), month, day);
        }

        return null;
    }

    private LocalTime resolveTime(String expression) {
        Matcher dayPart = DAY_PART.matcher(expression);
        if (dayPart.find()) {
            return adjustDayPart(Integer.parseInt(dayPart.group(1)), dayPart.group(2));
        }
        Matcher colon = COLON_TIME.matcher(expression);
        if (colon.find()) {
            return safeTime(Integer.parseInt(colon.group(1)), Integer.parseInt(colon.group(2)));
        }
        Matcher halfQuarter = HALF_QUARTER.matcher(expression);
        if (halfQuarter.find()) {
            int hour = Integer.parseInt(halfQuarter.group(1));
            int minute = "media".equals(halfQuarter.group(2)) ? 30 : 15;
            return safeTime(hour, minute);
        }
        Matcher amPm = AM_PM.matcher(expression);
        if (amPm.find()) {
            int hour = Integer.parseInt(amPm.group(1));
            boolean pm = "pm".equals(amPm.group(2));
            if (pm && hour < 12) {
                hour += 12;
            }
            if (!pm && hour == 12) {
                hour = 0;
            }
            return safeTime(hour, 0);
        }
        Matcher aLas = A_LAS.matcher(expression);
        if (aLas.find()) {
            int hour = Integer.parseInt(aLas.group(1));
            int minute = aLas.group(2) == null ? 0 : Integer.parseInt(aLas.group(2));
            return safeTime(hour, minute);
        }
        Matcher hourSuffix = HOUR_SUFFIX.matcher(expression);
        if (hourSuffix.find()) {
            return safeTime(Integer.parseInt(hourSuffix.group(1)), 0);
        }
        return null;
    }

    private LocalTime adjustDayPart(int hour, String part) {
        switch (part) {
            case "tarde" -> {
                if (hour < 12) {
                    hour += 12;
                }
            }
            case "noche" -> {
                if (hour == 12) {
                    hour = 0;
                } else if (hour < 12) {
                    hour += 12;
                }
            }
            case "madrugada" -> {
                if (hour == 12) {
                    hour = 0;
                }
            }
            default -> {
                if (hour == 12) {
                    hour = 12;
                }
            }
        }
        return safeTime(hour, 0);
    }

    private LocalTime safeTime(int hour, int minute) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return null;
        }
        return LocalTime.of(hour, minute);
    }

    private LocalDate safeDate(int year, int month, int day) {
        try {
            return LocalDate.of(year, month, day);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private LocalDateTime parseDateTime(int year, int month, int day, int hour, int minute, int second) {
        try {
            return LocalDateTime.of(year, month, day, hour, minute, second);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private String normalize(String value) {
        String lower = value.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
        return Normalizer.normalize(lower, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
    }
}
