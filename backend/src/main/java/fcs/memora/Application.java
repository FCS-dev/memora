package fcs.memora;

import fcs.memora.config.EnvVarValidator;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.List;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        List<String> missingVariables = EnvVarValidator.validateRequired(System.getenv());
        if (!missingVariables.isEmpty()) {
            System.err.println("Faltan variables de entorno requeridas: " + missingVariables);
            System.exit(1);
        }
        SpringApplication.run(Application.class, args);
    }
}
