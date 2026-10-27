package fcs.memora.validation;

import fcs.memora.ai.CodePointLimits;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CodePointSizeValidator implements ConstraintValidator<CodePointSize, String> {

    private int min;
    private int max;

    @Override
    public void initialize(CodePointSize annotation) {
        this.min = annotation.min();
        this.max = annotation.max();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }
        int count = CodePointLimits.count(value);
        return count >= min && count <= max;
    }
}
