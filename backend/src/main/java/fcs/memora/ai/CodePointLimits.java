package fcs.memora.ai;

public final class CodePointLimits {

    private CodePointLimits() {
        // utility class
    }

    public static int count(String value) {
        if (value == null) {
            return 0;
        }
        return value.codePointCount(0, value.length());
    }

    public static boolean isWithin(String value, int max) {
        return count(value) <= max;
    }

    public static String truncate(String value, int max) {
        if (value == null || count(value) <= max) {
            return value;
        }
        int end = value.offsetByCodePoints(0, max);
        return value.substring(0, end);
    }
}
