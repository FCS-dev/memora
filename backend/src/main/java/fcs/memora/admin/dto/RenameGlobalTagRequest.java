package fcs.memora.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameGlobalTagRequest(
    @NotBlank @Size(min = 1, max = 25) String tagName
) {
}
