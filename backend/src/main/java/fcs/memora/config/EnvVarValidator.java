package fcs.memora.config;

import java.util.List;
import java.util.Map;

public final class EnvVarValidator {

    private static final List<String> REQUIRED_VARIABLES = List.of(
            "DB_URL",
            "DB_USERNAME",
            "DB_PASSWORD",
            "SERVER_PORT"
    );

    private EnvVarValidator() {
        // utility class
    }

    public static List<String> validateRequired(Map<String, String> variables) {
        return REQUIRED_VARIABLES.stream()
                .filter(name -> variables.getOrDefault(name, "").isBlank())
                .toList();
    }
}
