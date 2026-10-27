package fcs.memora.ai;

import java.time.LocalDateTime;
import java.util.List;

public record NoteDraft(
    String title,
    String content,
    boolean checklistMode,
    List<NoteDraftChecklistItem> checklistItems,
    String rememberAtExpression,
    LocalDateTime rememberAt,
    List<Long> tagIds,
    boolean multipleIntents,
    List<AiWarningCode> warnings
) {
}
