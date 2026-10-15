package fcs.memora.note.dto;

public record CreateTagResponse(
    Long id,
    String tagName,
    boolean global,
    boolean reused
) {
}
