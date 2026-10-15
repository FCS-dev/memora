package fcs.memora.util;

import java.text.Normalizer;
import java.util.Locale;

public final class TextNormalizer {

    public static final int TAG_NAME_MAX_LENGTH = 25;

    private TextNormalizer() {
        // Utility class
    }

    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.toLowerCase(Locale.ROOT).trim();
    }

    public static String normalizeTagName(String tagName) {
        if (tagName == null) {
            return null;
        }
        String collapsed = tagName.trim().replaceAll("\\s+", " ");
        return Normalizer.normalize(collapsed, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
    }

    public static boolean isValidTagName(String normalizedTagName, int maxLength) {
        if (normalizedTagName == null) {
            return false;
        }
        String value = normalizedTagName.trim();
        return !value.isEmpty() && value.length() <= maxLength;
    }
}
