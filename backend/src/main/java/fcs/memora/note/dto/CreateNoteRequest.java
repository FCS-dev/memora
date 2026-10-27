package fcs.memora.note.dto;

import fcs.memora.note.validation.ChecklistPayload;
import fcs.memora.note.validation.ValidChecklist;
import fcs.memora.validation.CodePointSize;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@ValidChecklist
public record CreateNoteRequest(
    @NotBlank @CodePointSize(min = 1, max = 200) String title,
    @CodePointSize(max = 2500) String content,
    @NotNull boolean checklistMode,
    List<ChecklistItem> checklistItems,
    LocalDateTime rememberAt,
    @NotNull boolean isPinned,
    @NotNull boolean isArchived,
    Set<Long> tagIds,
    @Size(max = 36) String idempotencyKey
) implements ChecklistPayload {

    public CreateNoteRequest(String title, String content, boolean checklistMode,
                             List<ChecklistItem> checklistItems, LocalDateTime rememberAt,
                             boolean isPinned, boolean isArchived, Set<Long> tagIds) {
        this(title, content, checklistMode, checklistItems, rememberAt, isPinned, isArchived, tagIds, null);
    }
}
