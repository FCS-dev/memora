package fcs.memora.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiPropertiesTest {

    @Test
    void appliesSafeDefaultsWhenValuesAreAbsent() {
        AiProperties properties = new AiProperties(
            false, null, null, null, null, null, null, null, null, null
        );

        assertThat(properties.baseUrl()).isEqualTo("https://api.groq.com/openai/v1");
        assertThat(properties.model()).isEqualTo("openai/gpt-oss-20b");
        assertThat(properties.temperature()).isEqualTo(0.2);
        assertThat(properties.maxOutputTokens()).isEqualTo(2048);
        assertThat(properties.timeoutMs()).isEqualTo(20000);
        assertThat(properties.dailyLimit()).isEqualTo(50);
        assertThat(properties.maxInputCodePoints()).isEqualTo(2500);
        assertThat(properties.noticeVersion()).isEqualTo("1");
    }

    @Test
    void keepsExplicitValues() {
        AiProperties properties = new AiProperties(
            true, "key", "https://example.test/openai", "custom-model",
            0.1, 128, 5000, 10, 3000, "2"
        );

        assertThat(properties.enabled()).isTrue();
        assertThat(properties.apiKey()).isEqualTo("key");
        assertThat(properties.baseUrl()).isEqualTo("https://example.test/openai");
        assertThat(properties.model()).isEqualTo("custom-model");
        assertThat(properties.temperature()).isEqualTo(0.1);
        assertThat(properties.maxOutputTokens()).isEqualTo(128);
        assertThat(properties.timeoutMs()).isEqualTo(5000);
        assertThat(properties.dailyLimit()).isEqualTo(10);
        assertThat(properties.maxInputCodePoints()).isEqualTo(3000);
        assertThat(properties.noticeVersion()).isEqualTo("2");
    }
}
