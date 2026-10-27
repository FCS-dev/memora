package fcs.memora.config;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicationConfigTest {

    private static final Path CONFIG_PATH = Paths.get("src/main/resources/application.yaml");

    @Test
    void configurationUsesRequiredEnvironmentVariables() throws Exception {
        assertThat(CONFIG_PATH).exists();

        String content = Files.readString(CONFIG_PATH);

        assertThat(content).contains("${DB_URL}");
        assertThat(content).contains("${DB_USERNAME}");
        assertThat(content).contains("${DB_PASSWORD}");
        assertThat(content).contains("${SERVER_PORT}");
        assertThat(content).contains("${AI_ENABLED:false}");
        assertThat(content).contains("${GROQ_API_KEY:}");
        assertThat(content).contains("${GROQ_BASE_URL:https://api.groq.com/openai/v1}");
    }

    @Test
    void disablesOpenAiAutoConfigurationToKeepAiOptIn() throws Exception {
        String content = Files.readString(CONFIG_PATH);

        assertThat(content).contains("chat: none");
        assertThat(content).contains("embedding: none");
        assertThat(content).contains("image: none");
        assertThat(content).contains("moderation: none");
    }

    @Test
    void configurationDoesNotContainHardcodedSecrets() throws Exception {
        assertThat(CONFIG_PATH).exists();

        String content = Files.readString(CONFIG_PATH);

        assertThat(content).doesNotContain("jdbc:postgresql://");
        assertThat(content).doesNotContain("p4ssw0rd");
    }
}
