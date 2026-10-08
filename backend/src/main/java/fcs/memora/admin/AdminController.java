package fcs.memora.admin;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@Tag(name = "Administración", description = "Gestión de usuarios por administradores")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @PatchMapping("/users/{uuid}/status")
    @Operation(summary = "Cambiar el estado de un usuario")
    public ResponseEntity<Void> updateStatus(
        @PathVariable String uuid,
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody UpdateStatusRequest request) {
        adminService.updateStatus(userDetails.getUsername(), uuid, request);
        return ResponseEntity.ok().build();
    }
}
