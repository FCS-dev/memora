package fcs.memora.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NoteInterpretationRequest(
    @NotBlank String text,
    @Size(max = 64) String zoneId
) {
}
