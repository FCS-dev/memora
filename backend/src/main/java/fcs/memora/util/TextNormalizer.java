package fcs.memora.util;

public final class TextNormalizer {

    private TextNormalizer() {
        // Utility class
    }

    public static String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.toLowerCase().trim();
    }

    public static String normalizeTagName(String tagName) {
        if (tagName == null) {
            return null;
        }
        return tagName.toLowerCase().trim();
    }
}
