package fcs.memora.admin;

import fcs.memora.admin.dto.GlobalTagResponse;
import fcs.memora.admin.dto.RenameGlobalTagRequest;
import fcs.memora.note.dto.CreateTagRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/tags")
@Tag(name = "Administración", description = "Gestión de etiquetas globales")
public class AdminTagController {

    private final AdminTagService adminTagService;

    public AdminTagController(AdminTagService adminTagService) {
        this.adminTagService = adminTagService;
    }

    @PostMapping
    @Operation(summary = "Crear una etiqueta global")
    public ResponseEntity<GlobalTagResponse> create(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody CreateTagRequest request) {
        GlobalTagResponse response = adminTagService.create(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar etiquetas globales con su cantidad de notas")
    public ResponseEntity<List<GlobalTagResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(adminTagService.list(userDetails.getUsername()));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Renombrar una etiqueta global")
    public ResponseEntity<GlobalTagResponse> rename(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody RenameGlobalTagRequest request) {
        return ResponseEntity.ok(adminTagService.rename(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar una etiqueta global")
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @AuthenticationPrincipal UserDetails userDetails) {
        adminTagService.delete(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
