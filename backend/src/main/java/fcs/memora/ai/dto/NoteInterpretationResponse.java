package fcs.memora.ai.dto;

import fcs.memora.ai.AiWarningCode;

import java.util.List;

public record NoteInterpretationResponse(
    NoteDraftResponse draft,
    List<AiWarningCode> warnings
) {
}
