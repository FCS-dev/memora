package fcs.memora.note;

import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.NoteResponse;
import fcs.memora.note.dto.UpdateNoteRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notes")
@Tag(name = "Notas", description = "Gestión de notas del usuario")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping
    @Operation(summary = "Crear una nueva nota")
    public ResponseEntity<NoteResponse> create(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody CreateNoteRequest request) {
        NoteResponse response = noteService.create(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar notas del usuario")
    public ResponseEntity<List<NoteResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(noteService.list(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener una nota por ID")
    public ResponseEntity<NoteResponse> getById(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable Long id) {
        return ResponseEntity.ok(noteService.getById(userDetails.getUsername(), id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar una nota")
    public ResponseEntity<NoteResponse> update(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable Long id,
        @Valid @RequestBody UpdateNoteRequest request) {
        return ResponseEntity.ok(noteService.update(userDetails.getUsername(), id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar una nota")
    public ResponseEntity<Void> delete(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable Long id) {
        noteService.delete(userDetails.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
