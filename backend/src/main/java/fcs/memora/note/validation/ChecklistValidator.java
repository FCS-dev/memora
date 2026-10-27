package fcs.memora.note.validation;

import fcs.memora.ai.CodePointLimits;
import fcs.memora.note.dto.ChecklistItem;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;

public class ChecklistValidator implements ConstraintValidator<ValidChecklist, Object> {

    private static final int MAX_TOTAL_CODE_POINTS = 2500;

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
        int totalCodePoints = 0;
        for (ChecklistItem item : items) {
            if (item == null || item.text() == null) {
                continue;
            }
            String text = item.text().trim();
            if (!text.isEmpty()) {
                hasNonBlankText = true;
            }
            totalCodePoints += CodePointLimits.count(text);
        }

        return hasNonBlankText && totalCodePoints <= MAX_TOTAL_CODE_POINTS;
    }
}
