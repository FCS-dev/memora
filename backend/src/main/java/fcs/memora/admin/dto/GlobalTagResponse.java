package fcs.memora.admin.dto;

public record GlobalTagResponse(
    Long id,
    String tagName,
    long noteCount
) {
}
