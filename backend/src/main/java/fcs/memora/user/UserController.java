package fcs.memora.user;

import fcs.memora.user.dto.ChangePasswordRequest;
import fcs.memora.user.dto.UpdateNameRequest;
import fcs.memora.user.dto.UserProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@Tag(name = "Usuario", description = "Gestión del perfil del usuario autenticado")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    @Operation(summary = "Obtener el perfil del usuario autenticado")
    public ResponseEntity<UserProfileResponse> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getProfile(userDetails.getUsername()));
    }

    @PutMapping("/me")
    @Operation(summary = "Actualizar el nombre del usuario autenticado")
    public ResponseEntity<UserProfileResponse> updateName(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody UpdateNameRequest request) {
        return ResponseEntity.ok(userService.updateName(userDetails.getUsername(), request));
    }

    @PutMapping("/me/password")
    @Operation(summary = "Cambiar la contraseña del usuario autenticado")
    public ResponseEntity<Void> changePassword(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok().build();
    }
}
