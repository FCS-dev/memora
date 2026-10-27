package fcs.memora.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "memora.ai")
public record AiProperties(
    boolean enabled,
    String apiKey,
    String baseUrl,
    String model,
    Double temperature,
    Integer maxOutputTokens,
    Integer timeoutMs,
    Integer dailyLimit,
    Integer maxInputCodePoints,
    String noticeVersion
) {

    private static final String DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
    private static final String DEFAULT_MODEL = "openai/gpt-oss-20b";
    private static final double DEFAULT_TEMPERATURE = 0.2;
    private static final int DEFAULT_MAX_OUTPUT_TOKENS = 2048;
    private static final int DEFAULT_TIMEOUT_MS = 20000;
    private static final int DEFAULT_DAILY_LIMIT = 50;
    private static final int DEFAULT_MAX_INPUT_CODE_POINTS = 2500;
    private static final String DEFAULT_NOTICE_VERSION = "1";

    public AiProperties {
        baseUrl = defaultIfBlank(baseUrl, DEFAULT_BASE_URL);
        model = defaultIfBlank(model, DEFAULT_MODEL);
        temperature = temperature == null ? DEFAULT_TEMPERATURE : temperature;
        maxOutputTokens = maxOutputTokens == null ? DEFAULT_MAX_OUTPUT_TOKENS : maxOutputTokens;
        timeoutMs = timeoutMs == null ? DEFAULT_TIMEOUT_MS : timeoutMs;
        dailyLimit = dailyLimit == null ? DEFAULT_DAILY_LIMIT : dailyLimit;
        maxInputCodePoints = maxInputCodePoints == null
            ? DEFAULT_MAX_INPUT_CODE_POINTS
            : maxInputCodePoints;
        noticeVersion = defaultIfBlank(noticeVersion, DEFAULT_NOTICE_VERSION);
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
