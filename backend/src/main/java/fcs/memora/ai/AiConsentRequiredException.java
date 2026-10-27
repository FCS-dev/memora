package fcs.memora.ai;

public class AiConsentRequiredException extends RuntimeException {

    public AiConsentRequiredException() {
        super("Se requiere consentimiento para usar la IA");
    }
}
