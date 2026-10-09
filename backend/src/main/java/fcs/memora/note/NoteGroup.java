package fcs.memora.note;

public enum NoteGroup {

    PINNED,
    NOT_PINNED,
    ARCHIVED;

    public static NoteGroup resolve(boolean isPinned, boolean isArchived) {
        if (isArchived) {
            return ARCHIVED;
        }
        return isPinned ? PINNED : NOT_PINNED;
    }
}
