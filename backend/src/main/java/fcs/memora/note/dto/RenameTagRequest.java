package fcs.memora.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameTagRequest(
    @NotBlank @Size(min = 1, max = 25) String tagName
) {
}
