package fcs.memora.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChecklistItem(
    @NotBlank @Size(max = 2500) String text,
    @NotNull boolean checked
) {
}
