package fcs.memora.validation;

import fcs.memora.auth.dto.LoginRequest;
import fcs.memora.auth.dto.RegisterRequest;
import fcs.memora.note.dto.ChecklistItem;
import fcs.memora.note.dto.CreateNoteRequest;
import fcs.memora.note.dto.CreateTagRequest;
import fcs.memora.note.dto.UpdateChecklistItemRequest;
import fcs.memora.user.dto.UpdateNameRequest;
import jakarta.validation.Validator;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class FieldLengthValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void registerRequestAcceptsValidValues() {
        RegisterRequest request = new RegisterRequest("ana@example.com", "Ana", "12345678");
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void registerRequestRejectsShortName() {
        RegisterRequest request = new RegisterRequest("ana@example.com", "ab", "12345678");
        assertThat(validator.validate(request)).anyMatch(v -> v.getPropertyPath().toString().equals("name"));
    }

    @Test
    void registerRequestRejectsLongName() {
        RegisterRequest request = new RegisterRequest("ana@example.com", "a".repeat(151), "12345678");
        assertThat(validator.validate(request)).anyMatch(v -> v.getPropertyPath().toString().equals("name"));
    }

    @Test
    void registerRequestAcceptsBoundaryNameLengths() {
        assertThat(validator.validate(new RegisterRequest("ana@example.com", "abc", "12345678"))).isEmpty();
        assertThat(validator.validate(new RegisterRequest("ana@example.com", "a".repeat(150), "12345678"))).isEmpty();
    }

    @Test
    void registerRequestRejectsInvalidPasswords() {
        assertThat(validator.validate(new RegisterRequest("ana@example.com", "Ana", "1234567")))
            .anyMatch(v -> v.getPropertyPath().toString().equals("password"));
        assertThat(validator.validate(new RegisterRequest("ana@example.com", "Ana", "a".repeat(21))))
            .anyMatch(v -> v.getPropertyPath().toString().equals("password"));
    }

    @Test
    void registerRequestRejectsLongEmail() {
        RegisterRequest request = new RegisterRequest("a".repeat(146) + "@b.co", "Ana", "12345678");
        assertThat(validator.validate(request)).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @Test
    void loginRequestRequiresPasswordLength() {
        assertThat(validator.validate(new LoginRequest("ana@example.com", "1234567")))
            .anyMatch(v -> v.getPropertyPath().toString().equals("password"));
        assertThat(validator.validate(new LoginRequest("ana@example.com", "12345678"))).isEmpty();
    }

    @Test
    void updateNameRequestEnforcesMinimum() {
        assertThat(validator.validate(new UpdateNameRequest("ab")))
            .anyMatch(v -> v.getPropertyPath().toString().equals("name"));
        assertThat(validator.validate(new UpdateNameRequest("Ana"))).isEmpty();
    }

    @Test
    void createTagRequestEnforcesRange() {
        assertThat(validator.validate(new CreateTagRequest("")))
            .anyMatch(v -> v.getPropertyPath().toString().equals("tagName"));
        assertThat(validator.validate(new CreateTagRequest("a".repeat(26))))
            .anyMatch(v -> v.getPropertyPath().toString().equals("tagName"));
        assertThat(validator.validate(new CreateTagRequest("a".repeat(25)))).isEmpty();
    }

    @Test
    void createNoteRequestEnforcesTitleAndContent() {
        assertThat(validator.validate(note("", null, false, null)))
            .anyMatch(v -> v.getPropertyPath().toString().equals("title"));
        assertThat(validator.validate(note("a".repeat(201), null, false, null)))
            .anyMatch(v -> v.getPropertyPath().toString().equals("title"));
        assertThat(validator.validate(note("t", "a".repeat(2501), false, null)))
            .anyMatch(v -> v.getPropertyPath().toString().equals("content"));
        assertThat(validator.validate(note("t", "a".repeat(2500), false, null))).isEmpty();
        assertThat(validator.validate(note("t", null, false, null))).isEmpty();
    }

    @Test
    void noteLimitsUseCodePoints() {
        assertThat(validator.validate(note("😀".repeat(200), null, false, null))).isEmpty();
        assertThat(validator.validate(note("😀".repeat(201), null, false, null)))
            .anyMatch(v -> v.getPropertyPath().toString().equals("title"));
        assertThat(validator.validate(note("t", "😀".repeat(2500), false, null))).isEmpty();
        assertThat(validator.validate(note("t", "😀".repeat(2501), false, null)))
            .anyMatch(v -> v.getPropertyPath().toString().equals("content"));
    }

    @Test
    void checklistLimitsUseCodePoints() {
        assertThat(validator.validate(note("t", "", true,
            List.of(new ChecklistItem("😀".repeat(2500), true))))).isEmpty();
        assertThat(validator.validate(note("t", "", true,
            List.of(new ChecklistItem("😀".repeat(2501), true))))).isNotEmpty();
    }

    @Test
    void updateChecklistItemUsesCodePoints() {
        assertThat(validator.validate(new UpdateChecklistItemRequest("😀".repeat(2500), true))).isEmpty();
        assertThat(validator.validate(new UpdateChecklistItemRequest("😀".repeat(2501), true))).isNotEmpty();
    }

    @Test
    void checklistIsIgnoredWhenModeIsFalse() {
        assertThat(validator.validate(note("t", "c", false, null))).isEmpty();
        assertThat(validator.validate(note("t", "c", false, List.of(new ChecklistItem("a", true))))).isEmpty();
    }

    @Test
    void checklistModeRequiresAtLeastOneNonBlankItem() {
        assertThat(validator.validate(note("t", "", true, null))).isNotEmpty();
        assertThat(validator.validate(note("t", "", true, List.of()))).isNotEmpty();
        assertThat(validator.validate(note("t", "", true, List.of(new ChecklistItem("   ", true))))).isNotEmpty();
        assertThat(validator.validate(note("t", "", true, List.of(new ChecklistItem("item", true))))).isEmpty();
    }

    @Test
    void checklistKeysSumMustNotExceedLimit() {
        assertThat(validator.validate(note("t", "", true, List.of(new ChecklistItem("a".repeat(2500), true))))).isEmpty();
        assertThat(validator.validate(note("t", "", true, List.of(new ChecklistItem("a".repeat(2501), true))))).isNotEmpty();
    }

    private CreateNoteRequest note(String title, String content, boolean checklistMode, List<ChecklistItem> items) {
        return new CreateNoteRequest(title, content, checklistMode, items, null, false, false, Set.of());
    }
}
