package fcs.memora.ai.dto;

import fcs.memora.ai.NoteDraftChecklistItem;

import java.time.LocalDateTime;
import java.util.List;

public record NoteDraftResponse(
    String title,
    String content,
    boolean checklistMode,
    List<NoteDraftChecklistItem> checklistItems,
    LocalDateTime rememberAt,
    List<Long> tagIds
) {
}
