package fcs.memora.note.exception;

public class IdempotencyConflictException extends RuntimeException {

    public IdempotencyConflictException() {
        super("La clave de idempotencia ya fue usada con otros datos");
    }
}
