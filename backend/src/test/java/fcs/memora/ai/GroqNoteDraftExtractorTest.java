package fcs.memora.ai;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

class GroqNoteDraftExtractorTest {

    private final GroqNoteDraftExtractor extractor =
        new GroqNoteDraftExtractor(mock(ChatClient.class));

    @Test
    void parsesRawJsonReturnedByGroq() {
        NoteDraftModel model = extractor.parseModel("""
            {"content":"","checklistMode":false,
             "checklistItems":[],"rememberAt":null,"tagIds":[1],"multipleIntents":false,"isMemoraNote":true,"reason":"OK"}
            """);

        assertThat(model.tagIds()).containsExactly(1L);
        assertThat(model.content()).isEmpty();
    }

    @Test
    void stripsMarkdownFences() {
        NoteDraftModel model = extractor.parseModel("""
            ```json
            {"content":"","checklistMode":false,
             "checklistItems":[],"rememberAt":null,"tagIds":[],"multipleIntents":false,"isMemoraNote":true,"reason":"OK"}
            ```
            """);

        assertThat(model.tagIds()).isEmpty();
    }

    @Test
    void rejectsOutOfScopeModel() {
        NoteDraftModel model = extractor.parseModel("""
            {"isMemoraNote":false,"reason":"OUT_OF_SCOPE"}
            """);

        assertThatThrownBy(() -> extractor.toDraft(model))
            .isInstanceOf(OutOfScopeException.class);
    }

    @Test
    void rejectsEmptyOrInvalidContent() {
        assertThatThrownBy(() -> extractor.parseModel("  "))
            .isInstanceOf(AiProviderException.class);
        assertThatThrownBy(() -> extractor.parseModel("no json"))
            .isInstanceOf(AiProviderException.class);
    }
}
