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
}
