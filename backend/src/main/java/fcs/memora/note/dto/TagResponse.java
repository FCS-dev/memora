package fcs.memora.note.dto;

public record TagResponse(
    Long id,
    String tagName,
    boolean global,
    long noteCount
) {
}
