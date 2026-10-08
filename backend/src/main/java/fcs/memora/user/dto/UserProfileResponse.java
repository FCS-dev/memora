package fcs.memora.user.dto;

public record UserProfileResponse(
    String uuidUser,
    String email,
    String name,
    String role
) {
}
