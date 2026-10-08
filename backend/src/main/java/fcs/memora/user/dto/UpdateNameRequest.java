package fcs.memora.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateNameRequest(
    @NotBlank @Size(min = 3, max = 150) String name
) {
}
