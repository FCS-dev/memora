package fcs.memora.ai;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

class AiConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
        .withUserConfiguration(AiConfig.class, PropertiesConfig.class);

    @Test
    void startsWithoutChatModelWhenAiIsDisabled() {
        runner.withPropertyValues("memora.ai.enabled=false")
            .run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(context).doesNotHaveBean(ChatModel.class);
            });
    }

    @Test
    void createsChatModelWhenAiIsEnabledWithoutCallingTheProvider() {
        runner.withPropertyValues(
                "memora.ai.enabled=true",
                "memora.ai.api-key=test-key",
                "memora.ai.base-url=https://api.groq.com/openai/v1",
                "memora.ai.model=test-model"
            )
            .run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(context).hasSingleBean(ChatModel.class);
            });
    }

    @Test
    void failsFastWhenAiIsEnabledWithoutApiKey() {
        runner.withPropertyValues("memora.ai.enabled=true")
            .run(context -> {
                assertThat(context).hasFailed();
                assertThat(context.getStartupFailure())
                    .hasRootCauseMessage("GROQ_API_KEY es obligatoria cuando AI_ENABLED=true");
            });
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(AiProperties.class)
    static class PropertiesConfig {
    }
}
