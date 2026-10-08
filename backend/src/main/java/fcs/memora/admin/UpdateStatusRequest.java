package fcs.memora.admin;

import jakarta.validation.constraints.NotNull;
import fcs.memora.user.UserStatus;

public record UpdateStatusRequest(
    @NotNull UserStatus status
) {
}
