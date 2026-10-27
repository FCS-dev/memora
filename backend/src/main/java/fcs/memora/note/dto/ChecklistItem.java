package fcs.memora.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import fcs.memora.validation.CodePointSize;

public record ChecklistItem(
    @NotBlank @CodePointSize(max = 2500) String text,
    @NotNull boolean checked
) {
}
