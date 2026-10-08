package fcs.memora.note.dto;

import fcs.memora.note.validation.ChecklistPayload;
import fcs.memora.note.validation.ValidChecklist;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@ValidChecklist
public record UpdateNoteRequest(
    @NotBlank @Size(min = 1, max = 200) String title,
    @Size(max = 2500) String content,
    @NotNull boolean checklistMode,
    Map<String, Boolean> checklistItems,
    LocalDateTime rememberAt,
    @NotNull boolean isPinned,
    @NotNull boolean isArchived,
    Set<Long> tagIds
) implements ChecklistPayload {
}
