package fcs.memora.note.validation;

import fcs.memora.note.dto.ChecklistItem;

import java.util.List;

public interface ChecklistPayload {

    boolean checklistMode();

    List<ChecklistItem> checklistItems();
}
