package fcs.memora.ai;

import java.util.List;

public record NoteDraftModel(
    String content,
    Boolean checklistMode,
    List<NoteDraftChecklistItemModel> checklistItems,
    String rememberAt,
    List<Long> tagIds,
    Boolean multipleIntents,
    String rememberExpression,
    Boolean isMemoraNote,
    String reason
) {
}
