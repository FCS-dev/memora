package fcs.memora.ai;

public class AiDisabledException extends RuntimeException {

    public AiDisabledException() {
        super("La IA está desactivada");
    }
}
