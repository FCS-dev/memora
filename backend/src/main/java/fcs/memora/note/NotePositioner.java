package fcs.memora.note;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class NotePositioner {

    private NotePositioner() {
    }

    public static long resolvePosition(Long upper, Long lower, long step) {
        if (upper == null && lower == null) {
            return step;
        }
        if (upper == null) {
            return lower + step;
        }
        if (lower == null) {
            return upper - step;
        }
        return midpoint(upper, lower);
    }

    public static long midpoint(long upper, long lower) {
        return Math.floorDiv(upper + lower, 2);
    }

    public static boolean needsRebalance(long candidate, Long upper, Long lower) {
        if (candidate < 0) {
            return true;
        }
        if (upper != null && candidate >= upper) {
            return true;
        }
        return lower != null && candidate <= lower;
    }

    public static List<Long> rebalancedPositions(int count, long step) {
        List<Long> positions = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            positions.add(step * (count - i));
        }
        return positions;
    }

    public static boolean isValidUuid(String value) {
        if (value == null || value.length() != 36) {
            return false;
        }
        try {
            UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
