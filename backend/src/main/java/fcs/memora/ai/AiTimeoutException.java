package fcs.memora.ai;

public class AiTimeoutException extends RuntimeException {

    public AiTimeoutException() {
        super("El proveedor de IA no respondió a tiempo");
    }
}
