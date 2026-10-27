package fcs.memora.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import fcs.memora.note.dto.TagResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.List;

@Component
@ConditionalOnBean(ChatClient.class)
public class GroqNoteDraftExtractor implements NoteDraftExtractor {

    private final ChatClient chatClient;
    private final String systemPrompt;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GroqNoteDraftExtractor(ChatClient chatClient) {
        this.chatClient = chatClient;
        this.systemPrompt = loadPrompt();
    }

    @Override
    public NoteDraft extract(String text, ZoneId zone, Instant now, List<TagResponse> allowedTags) {
        ZonedDateTime localNow = zone == null ? now.atZone(ZoneOffset.UTC) : ZonedDateTime.ofInstant(now, zone);
        String current = localNow.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm EEEE", Locale.forLanguageTag("es-ES")));
        String tags = allowedTags.stream()
            .map(tag -> tag.id() + "=" + tag.tagName())
            .reduce((left, right) -> left + ", " + right)
            .orElse("ninguna");
        String system = systemPrompt
            + "\n\nFecha y hora local actual: " + current
            + "\nZona horaria: " + (zone == null ? "desconocida" : zone.getId())
            + "\nEtiquetas permitidas: " + tags;

        try {
            String userPayload = objectMapper.writeValueAsString(
                java.util.Map.of("texto_usuario", text)
            );
            String content = chatClient.prompt()
                .system(system)
                .user("Datos del usuario (JSON): " + userPayload)
                .call()
                .content();
            return toDraft(parseModel(content));
        } catch (AiProviderException | OutOfScopeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiProviderException("No se pudo interpretar el texto", ex);
        }
    }

    NoteDraftModel parseModel(String content) {
        if (content == null || content.isBlank()) {
            throw new AiProviderException("Respuesta vacía del proveedor");
        }
        String json = content.trim();
        if (json.startsWith("```")) {
            int firstLine = json.indexOf('\n');
            int lastFence = json.lastIndexOf("```");
            if (firstLine >= 0 && lastFence > firstLine) {
                json = json.substring(firstLine + 1, lastFence).trim();
            }
        }
        try {
            return objectMapper.readValue(json, NoteDraftModel.class);
        } catch (JsonProcessingException ex) {
            throw new AiProviderException("Respuesta inválida del proveedor", ex);
        }
    }

    private String rememberExpression(NoteDraftModel model) {
        return model.rememberExpression() == null || model.rememberExpression().isBlank()
            ? model.rememberAt()
            : model.rememberExpression();
    }

    NoteDraft toDraft(NoteDraftModel model) {
        if (!Boolean.TRUE.equals(model.isMemoraNote())) {
            throw new OutOfScopeException();
        }
        List<NoteDraftChecklistItem> items = model.checklistItems() == null
            ? List.of()
            : model.checklistItems().stream()
                .map(item -> new NoteDraftChecklistItem(
                    item.text(),
                    Boolean.TRUE.equals(item.checked())
                ))
                .toList();
        return new NoteDraft(
            null,
            model.content(),
            Boolean.TRUE.equals(model.checklistMode()),
            items,
            rememberExpression(model),
            null,
            model.tagIds() == null ? List.of() : List.copyOf(model.tagIds()),
            Boolean.TRUE.equals(model.multipleIntents()),
            List.of()
        );
    }

    private String loadPrompt() {
        try {
            ClassPathResource resource = new ClassPathResource("prompts/note-draft.st");
            return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo cargar el prompt de interpretación", ex);
        }
    }
}
