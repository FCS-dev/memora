package fcs.memora.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
    @NotBlank @Email @Size(min = 5, max = 150) String email,
    @NotBlank @Size(min = 8, max = 20) String password
) {
}
