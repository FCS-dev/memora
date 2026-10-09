package fcs.memora.note.dto;

import fcs.memora.note.NoteGroup;
import jakarta.validation.constraints.NotNull;

public record ChangeNoteGroupRequest(
    @NotNull NoteGroup group
) {
}
