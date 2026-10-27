package fcs.memora.ai;

public class TagCatalogUnavailableException extends RuntimeException {

    public TagCatalogUnavailableException() {
        super("No se pudieron cargar las etiquetas");
    }
}
