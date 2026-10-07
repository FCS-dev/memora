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
    }

    @Test
    void configurationDoesNotContainHardcodedSecrets() throws Exception {
        assertThat(CONFIG_PATH).exists();

        String content = Files.readString(CONFIG_PATH);

        assertThat(content).doesNotContain("jdbc:postgresql://");
        assertThat(content).doesNotContain("p4ssw0rd");
    }
}
