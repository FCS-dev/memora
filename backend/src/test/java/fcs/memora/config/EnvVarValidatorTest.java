package fcs.memora.config;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EnvVarValidatorTest {

    @Test
    void returnsEmptyWhenAllVariablesPresent() {
        Map<String, String> vars = Map.of(
                "DB_URL", "jdbc:postgresql://localhost:5432/memora",
                "DB_USERNAME", "admin",
                "DB_PASSWORD", "password",
                "SERVER_PORT", "8080"
        );

        assertThat(EnvVarValidator.validateRequired(vars)).isEmpty();
    }

    @Test
    void returnsMissingVariableNameWhenAbsent() {
        Map<String, String> vars = new HashMap<>(Map.of(
                "DB_URL", "jdbc:postgresql://localhost:5432/memora",
                "DB_USERNAME", "admin",
                "DB_PASSWORD", "password"
        ));

        assertThat(EnvVarValidator.validateRequired(vars)).containsExactly("SERVER_PORT");
    }

    @Test
    void returnsMissingVariableNameWhenEmpty() {
        Map<String, String> vars = new HashMap<>(Map.of(
                "DB_URL", "jdbc:postgresql://localhost:5432/memora",
                "DB_USERNAME", "admin",
                "DB_PASSWORD", "password",
                "SERVER_PORT", ""
        ));

        assertThat(EnvVarValidator.validateRequired(vars)).containsExactly("SERVER_PORT");
    }
}
