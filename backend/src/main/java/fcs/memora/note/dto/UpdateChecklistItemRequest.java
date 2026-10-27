package fcs.memora.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import fcs.memora.validation.CodePointSize;

public record UpdateChecklistItemRequest(
    @NotBlank @CodePointSize(max = 2500) String item,
    @NotNull Boolean checked
) {
}
