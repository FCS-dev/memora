package fcs.memora.ai;

import fcs.memora.ai.dto.NoteInterpretationRequest;
import fcs.memora.ai.dto.NoteInterpretationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notes")
@Tag(name = "Interpretación de notas", description = "Genera un borrador a partir de lenguaje natural")
public class NoteInterpretationController {

    private final NoteInterpretationService service;

    public NoteInterpretationController(NoteInterpretationService service) {
        this.service = service;
    }

    @PostMapping("/interpret")
    @Operation(summary = "Interpretar texto y generar un borrador de nota")
    public ResponseEntity<NoteInterpretationResponse> interpret(
        @AuthenticationPrincipal UserDetails userDetails,
        @Valid @RequestBody NoteInterpretationRequest request) {
        return ResponseEntity.ok(service.interpret(userDetails.getUsername(), request));
    }
}
