package fcs.memora.note.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ChecklistValidator.class)
@Documented
public @interface ValidChecklist {

    String message() default "El contenido de casillas es inválido";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
