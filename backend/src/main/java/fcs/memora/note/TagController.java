package fcs.memora.note;

import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.TagResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
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
    public ResponseEntity<TagResponse> create(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody CreateTagRequest request) {
        TagResponse response = tagService.create(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar etiquetas del usuario")
    public ResponseEntity<List<TagResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(tagService.list(userDetails.getUsername()));
    }
}
