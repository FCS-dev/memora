package fcs.memora.config;

import fcs.memora.ai.AiConsentRequiredException;
import fcs.memora.ai.AiDisabledException;
import fcs.memora.ai.AiProviderException;
import fcs.memora.ai.AiQuotaExceededException;
import fcs.memora.ai.AiTimeoutException;
import fcs.memora.ai.OutOfScopeException;
import fcs.memora.ai.TagCatalogUnavailableException;
import fcs.memora.note.exception.DuplicateTagException;
import fcs.memora.note.exception.IdempotencyConflictException;
import fcs.memora.note.exception.InvalidTagException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        return ResponseEntity.badRequest().body(buildErrorResponse("Solicitud inválida", 400, errors.toString()));
    }

    @ExceptionHandler(InvalidTagException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidTag(InvalidTagException ex) {
        return ResponseEntity.badRequest().body(buildErrorResponse("Solicitud inválida", 400, ex.getMessage()));
    }

    @ExceptionHandler(DuplicateTagException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateTag(DuplicateTagException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(buildErrorResponse("Conflicto", 409, ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(buildErrorResponse("Solicitud inválida", 400, ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(buildErrorResponse("No autorizado", 401, "Credenciales inválidas"));
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleDisabled(DisabledException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(buildErrorResponse("Prohibido", 403, "Cuenta no activa"));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(buildErrorResponse("No autorizado", 401, "Sesión expirada o token inválido"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(buildErrorResponse("Prohibido", 403, "No tienes permisos para acceder a este recurso"));
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(UsernameNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(buildErrorResponse("No encontrado", 404, "Recurso no encontrado"));
    }

    @ExceptionHandler(AiConsentRequiredException.class)
    public ResponseEntity<Map<String, Object>> handleAiConsentRequired(AiConsentRequiredException ex) {
        return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
            .body(buildErrorResponse("Consentimiento requerido", 428, ex.getMessage()));
    }

    @ExceptionHandler(AiQuotaExceededException.class)
    public ResponseEntity<Map<String, Object>> handleAiQuotaExceeded(AiQuotaExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(buildErrorResponse("Límite alcanzado", 429, ex.getMessage()));
    }

    @ExceptionHandler(AiDisabledException.class)
    public ResponseEntity<Map<String, Object>> handleAiDisabled(AiDisabledException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(buildErrorResponse("IA desactivada", 503, ex.getMessage()));
    }

    @ExceptionHandler(AiProviderException.class)
    public ResponseEntity<Map<String, Object>> handleAiProvider(AiProviderException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(buildErrorResponse("Fallo de IA", 502, "No se pudo completar la interpretación"));
    }

    @ExceptionHandler(AiTimeoutException.class)
    public ResponseEntity<Map<String, Object>> handleAiTimeout(AiTimeoutException ex) {
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)
            .body(buildErrorResponse("Tiempo de espera agotado", 504, ex.getMessage()));
    }

    @ExceptionHandler(OutOfScopeException.class)
    public ResponseEntity<Map<String, Object>> handleOutOfScope(OutOfScopeException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(buildErrorResponse("Fuera de alcance", 422, ex.getMessage()));
    }

    @ExceptionHandler(TagCatalogUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleTagCatalogUnavailable(TagCatalogUnavailableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(buildErrorResponse("No se pudo preparar la interpretación", 502, ex.getMessage()));
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<Map<String, Object>> handleIdempotencyConflict(IdempotencyConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(buildErrorResponse("Conflicto", 409, ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(buildErrorResponse("Error interno", 500, "Ocurrió un error inesperado"));
    }

    private Map<String, Object> buildErrorResponse(String title, int status, String detail) {
        Map<String, Object> error = new HashMap<>();
        error.put("title", title);
        error.put("status", status);
        error.put("detail", detail);
        error.put("timestamp", Instant.now().toString());
        return error;
    }
}
