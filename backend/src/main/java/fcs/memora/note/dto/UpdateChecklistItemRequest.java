package fcs.memora.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateChecklistItemRequest(
    @NotBlank @Size(max = 2500) String item,
    @NotNull Boolean checked
) {
}
