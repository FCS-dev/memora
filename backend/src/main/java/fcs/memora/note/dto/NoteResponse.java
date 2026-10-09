package fcs.memora.note.dto;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

public record NoteResponse(
    String uuidNote,
    String title,
    String content,
    boolean checklistMode,
    Map<String, Boolean> checklistItems,
    LocalDateTime rememberAt,
    boolean isPinned,
    boolean isArchived,
    Set<String> tags,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
