package fcs.memora.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank @Size(min = 3, max = 150) String name,
    @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String avatarColor
) {
}
