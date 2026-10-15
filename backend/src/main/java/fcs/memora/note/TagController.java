package fcs.memora.note;

import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.CreateTagResponse;
import fcs.memora.note.dto.RenameTagRequest;
import fcs.memora.note.dto.TagResponse;
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
@RequestMapping("/tags")
@Tag(name = "Tags", description = "Gestión de etiquetas del usuario")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @PostMapping
    @Operation(summary = "Crear una nueva etiqueta")
    public ResponseEntity<CreateTagResponse> create(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody CreateTagRequest request) {
        CreateTagResponse response = tagService.create(userDetails.getUsername(), request);
        if (response.reused()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar etiquetas del usuario")
    public ResponseEntity<List<TagResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tagService.list(userDetails.getUsername()));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Renombrar una etiqueta privada")
    public ResponseEntity<TagResponse> rename(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable Long id,
        @Valid @RequestBody RenameTagRequest request) {
        return ResponseEntity.ok(tagService.rename(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar una etiqueta privada")
    public ResponseEntity<Void> delete(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable Long id) {
        tagService.delete(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
