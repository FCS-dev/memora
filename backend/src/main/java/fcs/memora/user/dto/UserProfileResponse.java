package fcs.memora.user.dto;

public record UserProfileResponse(
    String uuidUser,
    String email,
    String name,
    String role,
    String avatarColor,
    boolean aiEnabled,
    String aiConsent,
    boolean aiConsentRequired,
    String aiConsentNoticeVersion
) {
}
