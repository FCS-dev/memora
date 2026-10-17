package fcs.memora.user;

import java.util.concurrent.ThreadLocalRandom;

public enum AvatarColor {
    INDIGO("#4F5DFF"),
    EMERALD("#059669"),
    ROSE("#E11D48"),
    VIOLET("#7C3AED"),
    CYAN("#0891B2"),
    AMBER("#B45309"),
    FUCHSIA("#C026D3"),
    TEAL("#0D9488");

    private final String hex;

    AvatarColor(String hex) {
        this.hex = hex;
    }

    public String getHex() {
        return hex;
    }

    public static String randomHex() {
        AvatarColor[] values = values();
        return values[ThreadLocalRandom.current().nextInt(values.length)].getHex();
    }
}
