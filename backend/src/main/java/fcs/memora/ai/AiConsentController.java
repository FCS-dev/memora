package fcs.memora.ai;

import fcs.memora.ai.dto.AiConsentRequest;
import fcs.memora.user.UserService;
import fcs.memora.user.dto.UserProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/me/ai-consent")
@Tag(name = "Consentimiento de IA", description = "Gestión del consentimiento para el proveedor externo de IA")
public class AiConsentController {

    private final AiConsentService aiConsentService;
    private final UserService userService;

    public AiConsentController(AiConsentService aiConsentService, UserService userService) {
        this.aiConsentService = aiConsentService;
        this.userService = userService;
    }

    @PutMapping
    @Operation(summary = "Registrar la decisión de consentimiento de IA")
    public ResponseEntity<UserProfileResponse> update(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody AiConsentRequest request) {
        aiConsentService.update(userDetails.getUsername(), request.action(), request.noticeVersion());
        return ResponseEntity.ok(userService.getProfile(userDetails.getUsername()));
    }
}
