package fcs.memora.note;

import fcs.memora.note.dto.ChangeNoteGroupRequest;
import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.CreateNoteResult;
import fcs.memora.note.dto.NoteResponse;
import fcs.memora.note.dto.ReorderNoteRequest;
import fcs.memora.note.dto.UpdateChecklistItemRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
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
        CreateNoteResult result = noteService.createResult(userDetails.getUsername(), request);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result.note());
    }

    @GetMapping
    @Operation(summary = "Listar notas no archivadas del usuario")
    public ResponseEntity<List<NoteResponse>> list(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(noteService.list(userDetails.getUsername()));
    }

    @GetMapping("/archived")
    @Operation(summary = "Listar notas archivadas del usuario")
    public ResponseEntity<List<NoteResponse>> listArchived(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(noteService.listArchived(userDetails.getUsername()));
    }

    @GetMapping("/{uuidNote}")
    @Operation(summary = "Obtener una nota por su identificador público")
    public ResponseEntity<NoteResponse> getByUuid(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String uuidNote) {
        return ResponseEntity.ok(noteService.getByUuid(userDetails.getUsername(), uuidNote));
    }

    @PutMapping("/{uuidNote}")
    @Operation(summary = "Actualizar una nota")
    public ResponseEntity<NoteResponse> update(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String uuidNote,
        @Valid @RequestBody UpdateNoteRequest request) {
        return ResponseEntity.ok(noteService.update(userDetails.getUsername(), uuidNote, request));
    }

    @DeleteMapping("/{uuidNote}")
    @Operation(summary = "Eliminar una nota")
    public ResponseEntity<Void> delete(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String uuidNote) {
        noteService.delete(userDetails.getUsername(), uuidNote);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{uuidNote}/position")
    @Operation(summary = "Reordenar una nota dentro de su grupo")
    public ResponseEntity<NoteResponse> reorder(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String uuidNote,
        @RequestBody ReorderNoteRequest request) {
        return ResponseEntity.ok(noteService.reorder(userDetails.getUsername(), uuidNote, request));
    }

    @PatchMapping("/{uuidNote}/group")
    @Operation(summary = "Cambiar una nota de grupo")
    public ResponseEntity<NoteResponse> changeGroup(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String uuidNote,
        @Valid @RequestBody ChangeNoteGroupRequest request) {
        return ResponseEntity.ok(noteService.changeGroup(userDetails.getUsername(), uuidNote, request));
    }

    @PatchMapping("/{uuidNote}/checklist")
    @Operation(summary = "Marcar o desmarcar un ítem de una nota checklist")
    public ResponseEntity<NoteResponse> updateChecklistItem(
        @AuthenticationPrincipal UserDetails userDetails,
        @PathVariable String uuidNote,
        @Valid @RequestBody UpdateChecklistItemRequest request) {
        return ResponseEntity.ok(noteService.updateChecklistItem(
            userDetails.getUsername(), uuidNote, request.item(), request.checked()));
    }
}
