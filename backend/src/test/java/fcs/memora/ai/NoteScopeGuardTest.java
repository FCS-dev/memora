package fcs.memora.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NoteScopeGuardTest {

    private final NoteScopeGuard guard = new NoteScopeGuard();

    @Test
    void rejectsCodeRequests() {
        assertThatThrownBy(() -> guard.check("haz el código hola mundo en python"))
            .isInstanceOf(OutOfScopeException.class);
        assertThatThrownBy(() -> guard.check("escribe una función en java"))
            .isInstanceOf(OutOfScopeException.class);
        assertThatThrownBy(() -> guard.check("```python\nprint('hola')\n```"))
            .isInstanceOf(OutOfScopeException.class);
        assertThatThrownBy(() -> guard.check("SELECT * FROM users"))
            .isInstanceOf(OutOfScopeException.class);
    }

    @Test
    void rejectsAssistantRequests() {
        assertThatThrownBy(() -> guard.check("explícame qué es un closure"))
            .isInstanceOf(OutOfScopeException.class);
        assertThatThrownBy(() -> guard.check("traduce esto al inglés"))
            .isInstanceOf(OutOfScopeException.class);
        assertThatThrownBy(() -> guard.check("resuelve 2 + 2"))
            .isInstanceOf(OutOfScopeException.class);
    }

    @Test
    void allowsNoteAndReminderRequests() {
        assertThatCode(() -> guard.check("Recordarme que el viernes debo ir a mercadona"))
            .doesNotThrowAnyException();
        assertThatCode(() -> guard.check("comprar leche y pan mañana a las 18"))
            .doesNotThrowAnyException();
        assertThatCode(() -> guard.check("tarea: llamar a Juan"))
            .doesNotThrowAnyException();
        assertThatCode(() -> guard.check("nota: idea para el proyecto"))
            .doesNotThrowAnyException();
        assertThatCode(() -> guard.check("revisar el informe mañana"))
            .doesNotThrowAnyException();
    }
}
