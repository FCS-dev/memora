package fcs.memora.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CodePointLimitsTest {

    @Test
    void countsCodePointsNotUtf16Units() {
        assertThat(CodePointLimits.count("a")).isEqualTo(1);
        assertThat(CodePointLimits.count("😀")).isEqualTo(1);
        assertThat(CodePointLimits.count("a😀b")).isEqualTo(3);
    }

    @Test
    void truncatesWithoutSplittingSurrogatePairs() {
        assertThat(CodePointLimits.truncate("a😀b", 2)).isEqualTo("a😀");
        assertThat(CodePointLimits.truncate("abc", 10)).isEqualTo("abc");
        assertThat(CodePointLimits.isWithin("😀😀", 2)).isTrue();
        assertThat(CodePointLimits.isWithin("😀😀", 1)).isFalse();
    }
}
