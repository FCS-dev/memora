package fcs.memora.ai.dto;

import fcs.memora.ai.AiConsentAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AiConsentRequest(
    @NotNull AiConsentAction action,
    @NotBlank @Size(max = 20) String noticeVersion
) {
}
