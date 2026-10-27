package fcs.memora.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.Duration;

@Configuration
public class AiConfig {

    @Bean
    @ConditionalOnMissingBean(Clock.class)
    public Clock clock() {
        return Clock.systemDefaultZone();
    }

    @Bean
    @ConditionalOnProperty(prefix = "memora.ai", name = "enabled", havingValue = "true")
    public ChatModel chatModel(AiProperties properties) {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new IllegalStateException("GROQ_API_KEY es obligatoria cuando AI_ENABLED=true");
        }

        OpenAiChatOptions options = OpenAiChatOptions.builder()
            .baseUrl(properties.baseUrl())
            .apiKey(properties.apiKey())
            .model(properties.model())
            .temperature(properties.temperature())
            .maxTokens(properties.maxOutputTokens())
            .timeout(Duration.ofMillis(properties.timeoutMs()))
            .build();

        return OpenAiChatModel.builder()
            .options(options)
            .build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "memora.ai", name = "enabled", havingValue = "true")
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel).build();
    }
}
