package fcs.memora.note.validation;

import fcs.memora.note.dto.ChecklistItem;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;

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

        List<ChecklistItem> items = payload.checklistItems();
        if (items == null || items.isEmpty()) {
            return false;
        }

        boolean hasNonBlankText = false;
        long totalLength = 0;
        for (ChecklistItem item : items) {
            if (item == null || item.text() == null) {
                continue;
            }
            if (item.text().trim().length() >= 1) {
                hasNonBlankText = true;
            }
            totalLength += item.text().length();
        }

        return hasNonBlankText && totalLength <= MAX_KEYS_LENGTH;
    }
}
