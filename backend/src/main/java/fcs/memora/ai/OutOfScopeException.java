package fcs.memora.ai;

public class OutOfScopeException extends RuntimeException {

    public OutOfScopeException() {
        super("Solo puedo convertir notas, recordatorios y tareas");
    }
}
