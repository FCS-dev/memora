package fcs.memora.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextNormalizerTest {

    @Test
    void shouldNormalizeEmail() {
        assertThat(TextNormalizer.normalizeEmail("  Test@Example.COM  "))
            .isEqualTo("test@example.com");
        assertThat(TextNormalizer.normalizeEmail("user@DOMAIN.ORG"))
            .isEqualTo("user@domain.org");
    }

    @Test
    void shouldNormalizeTagName() {
        assertThat(TextNormalizer.normalizeTagName("  Important  "))
            .isEqualTo("important");
        assertThat(TextNormalizer.normalizeTagName("WORK"))
            .isEqualTo("work");
    }

    @Test
    void shouldCollapseInternalWhitespaceInTagName() {
        assertThat(TextNormalizer.normalizeTagName("casa    grande"))
            .isEqualTo("casa grande");
        assertThat(TextNormalizer.normalizeTagName("casa\t\ngrande"))
            .isEqualTo("casa grande");
        assertThat(TextNormalizer.normalizeTagName("  casa   grande  "))
            .isEqualTo("casa grande");
    }

    @Test
    void shouldApplyNfcToTagName() {
        String composed = "caf\u00e9";      // café
        String decomposed = "cafe\u0301";   // cafe + combining acute
        assertThat(TextNormalizer.normalizeTagName(decomposed))
            .isEqualTo(TextNormalizer.normalizeTagName(composed));
    }

    @Test
    void shouldTreatAccentsAsDifferent() {
        assertThat(TextNormalizer.normalizeTagName("s\u00e1bana"))
            .isNotEqualTo(TextNormalizer.normalizeTagName("sabana"));
    }

    @Test
    void shouldLowercaseWithLocaleRoot() {
        assertThat(TextNormalizer.normalizeTagName("IMPORTANT"))
            .isEqualTo("important");
    }

    @Test
    void shouldValidateTagName() {
        assertThat(TextNormalizer.isValidTagName("a", 25)).isTrue();
        assertThat(TextNormalizer.isValidTagName("a".repeat(25), 25)).isTrue();
        assertThat(TextNormalizer.isValidTagName("a".repeat(26), 25)).isFalse();
        assertThat(TextNormalizer.isValidTagName("", 25)).isFalse();
        assertThat(TextNormalizer.isValidTagName("   ", 25)).isFalse();
        assertThat(TextNormalizer.isValidTagName(null, 25)).isFalse();
    }
}
