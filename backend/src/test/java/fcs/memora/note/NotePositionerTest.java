package fcs.memora.note;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import java.util.UUID;

class NotePositionerTest {

    private static final long STEP = 100_000L;

    @Test
    void resolvePositionOnEmptyGroupReturnsBase() {
        assertThat(NotePositioner.resolvePosition(null, null, STEP)).isEqualTo(STEP);
    }

    @Test
    void resolvePositionAtTopGoesAboveUpperBound() {
        assertThat(NotePositioner.resolvePosition(null, 500L, STEP)).isEqualTo(500L + STEP);
    }

    @Test
    void resolvePositionAtBottomGoesBelowLowerBound() {
        assertThat(NotePositioner.resolvePosition(300_000L, null, STEP)).isEqualTo(200_000L);
    }

    @Test
    void resolvePositionBetweenNeighborsReturnsMidpoint() {
        assertThat(NotePositioner.resolvePosition(700L, 500L, STEP)).isEqualTo(600L);
    }

    @Test
    void midpointFloorsTowardNegativeInfinity() {
        assertThat(NotePositioner.midpoint(501L, 500L)).isEqualTo(500L);
        assertThat(NotePositioner.midpoint(600L, 500L)).isEqualTo(550L);
    }

    @Test
    void needsRebalanceWhenNoIntegerGap() {
        assertThat(NotePositioner.needsRebalance(500L, 501L, 500L)).isTrue();
        assertThat(NotePositioner.needsRebalance(501L, 501L, 500L)).isTrue();
    }

    @Test
    void needsRebalanceWhenNegative() {
        assertThat(NotePositioner.needsRebalance(-100L, null, null)).isTrue();
    }

    @Test
    void doesNotNeedRebalanceWhenRoomExists() {
        assertThat(NotePositioner.needsRebalance(500L, 600L, 300L)).isFalse();
        assertThat(NotePositioner.needsRebalance(600L, null, 500L)).isFalse();
    }

    @Test
    void rebalancedPositionsAreDescendingAndPositive() {
        assertThat(NotePositioner.rebalancedPositions(3, STEP))
            .containsExactly(3 * STEP, 2 * STEP, STEP);
        assertThat(NotePositioner.rebalancedPositions(0, STEP)).isEmpty();
    }

    @Test
    void validatesUuidFormat() {
        assertThat(NotePositioner.isValidUuid(UUID.randomUUID().toString())).isTrue();
        assertThat(NotePositioner.isValidUuid("f47ac10b58cc4372a5670e02b2c3d479")).isFalse();
        assertThat(NotePositioner.isValidUuid("not-a-uuid")).isFalse();
        assertThat(NotePositioner.isValidUuid(null)).isFalse();
    }

    @Test
    void resolvesGroupFromFlags() {
        assertThat(NoteGroup.resolve(true, false)).isEqualTo(NoteGroup.PINNED);
        assertThat(NoteGroup.resolve(false, false)).isEqualTo(NoteGroup.NOT_PINNED);
        assertThat(NoteGroup.resolve(true, true)).isEqualTo(NoteGroup.ARCHIVED);
        assertThat(NoteGroup.resolve(false, true)).isEqualTo(NoteGroup.ARCHIVED);
    }
}
