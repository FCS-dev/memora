package fcs.memora.ai;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public final class NoteScopeGuard {

    private static final List<Pattern> CODE_PATTERNS = List.of(
        Pattern.compile("```"),
        Pattern.compile("\\b(haz|crea|genera|escribe|implementa|programa)\\b.*\\b(codigo|programa|script|funcion|clase|aplicacion|app)\\b"),
        Pattern.compile("\\b(python|java|javascript|typescript|c\\+\\+|c#|html|css|sql|php|ruby|kotlin|swift|rust)\\b.*\\b(codigo|programa|funcion|script|haz|escribe|genera)\\b"),
        Pattern.compile("\\b(print\\s*\\(|console\\.log|def\\s+\\w+\\s*\\(|class\\s+\\w+|public\\s+static|#include)\\b"),
        Pattern.compile("\\bselect\\s+.+\\s+from\\b"),
        Pattern.compile("\\bhola mundo\\b.*\\b(python|java|javascript|typescript|html|css|sql|php|ruby|kotlin|swift|rust)\\b")
    );

    private static final List<Pattern> ASSISTANT_PATTERNS = List.of(
        Pattern.compile("^(explica|explicame|traduce|traducemelo|resuelve|calcula|cuentame|dime|que es|que son|como se|por que|quien|quienes|cual|cuales)\\b")
    );

    public void check(String text) {
        String normalized = normalize(text);
        if (CODE_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(normalized).find())
            || ASSISTANT_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(normalized).find())) {
            throw new OutOfScopeException();
        }
    }

    private String normalize(String value) {
        String lower = value == null ? "" : value.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
        return Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
