package fcs.memora.ai;

import fcs.memora.note.dto.TagResponse;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

public interface NoteDraftExtractor {

    NoteDraft extract(String text, ZoneId zone, Instant now, List<TagResponse> allowedTags);
}
