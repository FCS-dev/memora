package fcs.memora.note.dto;

public record ReorderNoteRequest(
    String beforeUuid,
    String afterUuid
) {
}
