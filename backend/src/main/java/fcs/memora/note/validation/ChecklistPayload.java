package fcs.memora.note.validation;

import java.util.Map;

public interface ChecklistPayload {

    boolean checklistMode();

    Map<String, Boolean> checklistItems();
}
