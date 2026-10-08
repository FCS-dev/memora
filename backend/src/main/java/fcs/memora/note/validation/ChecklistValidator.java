package fcs.memora.note.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Map;

public class ChecklistValidator implements ConstraintValidator<ValidChecklist, Object> {

    private static final int MAX_KEYS_LENGTH = 2500;

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (!(value instanceof ChecklistPayload payload)) {
            return true;
        }
        if (!payload.checklistMode()) {
            return true;
        }

        Map<String, Boolean> items = payload.checklistItems();
        if (items == null || items.isEmpty()) {
            return false;
        }

        boolean hasNonBlankKey = false;
        long totalLength = 0;
        for (String key : items.keySet()) {
            if (key == null) {
                continue;
            }
            if (key.trim().length() >= 1) {
                hasNonBlankKey = true;
            }
            totalLength += key.length();
        }

        return hasNonBlankKey && totalLength <= MAX_KEYS_LENGTH;
    }
}
