package fcs.memora.ai;

public class AiQuotaExceededException extends RuntimeException {

    public AiQuotaExceededException() {
        super("Se alcanzó el límite diario de IA");
    }
}
