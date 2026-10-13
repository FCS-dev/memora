# Plan 006 — Checklist ordenado, focus y estado vacío

## 1. Archivos y responsabilidades

### Backend

| Archivo | Responsabilidad |
|---------|-----------------|
| `fcs.memora.note.dto.ChecklistItem` | Nuevo record que representa un ítem de checklist ordenado: `text` y `checked`. |
| `fcs.memora.note.dto.CreateNoteRequest` | Cambiar `checklistItems` de `Map<String, Boolean>` a `List<ChecklistItem>`. |
| `fcs.memora.note.dto.UpdateNoteRequest` | Cambiar `checklistItems` de `Map<String, Boolean>` a `List<ChecklistItem>`. |
| `fcs.memora.note.dto.NoteResponse` | Cambiar `checklistItems` de `Map<String, Boolean>` a `List<ChecklistItem>`. |
| `fcs.memora.note.validation.ChecklistPayload` | Cambiar firma de `checklistItems()` a `List<ChecklistItem>`. |
| `fcs.memora.note.validation.ChecklistValidator` | Validar lista ordenada: no vacía, al menos un texto no en blanco, suma de longitudes ≤ 2500. |
| `fcs.memora.note.NoteService` | Serializar/deserializar lista JSON; actualizar ítem por texto; devolver lista ordenada. |
| `backend/src/test/java/fcs/memora/note/NoteServiceTest.java` | Tests de orden, actualización parcial y mutaciones. |
| `backend/src/test/java/fcs/memora/note/NoteControllerTest.java` | Tests de API con lista ordenada. |
| `backend/src/test/java/fcs/memora/validation/FieldLengthValidationTest.java` | Tests del validador con lista. |

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `frontend/src/features/notes/model/types.ts` | `Note.checklistItems`, payloads y `ChecklistItemForm` como array ordenado. |
| `frontend/src/features/notes/model/validation.ts` | Adaptar transformaciones y validaciones al array. |
| `frontend/src/features/notes/model/copy.ts` | Textos del estado vacío. |
| `frontend/src/features/notes/api/notesApi.ts` | Tipos de request/response alineados al array. |
| `frontend/src/features/notes/hooks/useNoteEditor.ts` | Agregar `moveChecklistItem(fromIndex, toIndex)`. |
| `frontend/src/features/notes/components/NoteEditor.tsx` | Drag-and-drop de ítems, atajos de teclado, auto-focus. |
| `frontend/src/features/notes/components/NoteCard.tsx` | Renderizar array de ítems. |
| `frontend/src/features/notes/components/NotesPanel.tsx` | Mostrar leyenda de vacío. |
| Tests de frontend | Actualizar existentes y agregar tests de reorder, teclado, focus y vacío. |

---

## 2. Funciones puras y algoritmos

### Backend

#### Validación de checklist (ChecklistValidator)

```
function isValid(checklistMode, items):
  if not checklistMode: return true
  if items is null or empty: return false
  hasNonBlank = any(item.text.trim().length >= 1)
  totalLength = sum(item.text.length for each item)
  return hasNonBlank and totalLength <= 2500
```

#### Actualización parcial de ítem (NoteService.updateChecklistItem)

```
function updateChecklistItem(note, itemText, checked):
  if not note.checklistMode: throw IllegalArgumentException
  items = fromJson(note.contentJson)
  index = first index where items[i].text == itemText
  if index not found: throw UsernameNotFoundException
  items[index].checked = checked
  note.contentJson = toJson(items)
```

### Frontend

#### Reordenamiento en useNoteEditor

```
function moveChecklistItem(fromIndex, toIndex):
  if fromIndex == toIndex: return
  items = [...values.checklistItems]
  removed = items.splice(fromIndex, 1)[0]
  items.splice(toIndex, 0, removed)
  update({ checklistItems: items })
```

#### Cálculo de índice destino con pointer (NoteEditor)

```
function findTargetIndex(clientX, clientY):
  element = document.elementFromPoint(clientX, clientY)
  row = element.closest('[data-checklist-index]')
  if row: return parseInt(row.dataset.checklistIndex)
  return null
```

---

## 3. Interfaces

### Backend

```java
public record ChecklistItem(String text, boolean checked) {}

public record CreateNoteRequest(
    ...,
    List<ChecklistItem> checklistItems,
    ...
) implements ChecklistPayload {}

public record NoteResponse(
    ...,
    List<ChecklistItem> checklistItems,
    ...
) {}
```

### Frontend

```ts
export interface ChecklistItemForm {
  clientId: string
  text: string
  checked: boolean
}

export interface Note {
  ...
  checklistItems: ChecklistItemForm[] | null
  ...
}
```

`clientId` es un identificador local generado al crear un ítem; no se envía al backend.

---

## 4. Decisiones justificadas

### Cambiar el modelo de `Map` a `List`

**Elegida:** lista ordenada de objetos.

**Justificación:** preserva el orden definido por el usuario, resuelve el problema de JSONB reordenando claves y permite ítems duplicados.

**Alternativa descartada:** mantener `Map` y agregar un campo de orden separado. Es más frágil y requiere sincronizar dos estructuras.

### `clientId` local en frontend

**Elegido:** generar un ID local por ítem para usar como React key.

**Justificación:** evita problemas de reconciliación al reordenar cuando se usaba `key={index}`.

**Alternativa descartada:** usar `key={item.text}`. Falla con textos duplicados.

### Reordenamiento con Pointer Events custom

**Elegido:** implementación propia con asa de arrastre, igual que el reordenamiento de notas.

**Justificación:** consistencia con el código existente, sin agregar dependencias.

**Alternativa descartada:** librerías como `@dnd-kit/sortable`. Añaden dependencia y complejidad innecesaria para una lista vertical simple.

### Atajos `Ctrl/Cmd + ↑/↓`

**Elegidos:** combinación estándar para mover ítems en listas.

**Justificación:** fácil de recordar y no entra en conflicto con atajos existentes de la aplicación.

### Estado vacío solo con texto

**Elegido:** título y mensaje sin botón adicional.

**Justificación:** evita duplicar el botón "Nueva nota" y el FAB ya presentes en la interfaz.

---

## 5. Estrategia de tests

### Backend

- **Unitarios (`NoteServiceTest`):**
  - Crear nota checklist con lista ordenada y verificar que `contentJson` la conserva.
  - Actualizar nota checklist y verificar orden.
  - `updateChecklistItem` actualiza el estado del primer ítem con texto coincidente.
  - `toResponse` devuelve la lista en orden.

- **API (`NoteControllerTest`):**
  - POST `/notes` con lista ordenada.
  - PUT `/notes/{uuid}` con lista reordenada.
  - PATCH `/notes/{uuid}/checklist` marca ítem en lista ordenada.

- **Validación (`FieldLengthValidationTest`):**
  - Lista vacía, lista con solo textos en blanco, lista con suma de textos > 2500.
  - Modo texto ignora `checklistItems`.

### Frontend

- **`useNoteEditor.test.ts`:**
  - `moveChecklistItem` reordena correctamente.

- **`NoteEditor.test.tsx`:**
  - Arrastrar asa cambia el orden de los inputs.
  - `Ctrl + ↓` mueve el ítem enfocado hacia abajo.
  - Agregar ítem enfoca el nuevo input al inicio.

- **`NotesPanel.test.tsx`:**
  - Panel principal sin notas muestra leyenda.
  - Archivadas sin notas muestra leyenda.
  - Con notas no muestra leyenda.

- **Suite general:**
  - `npm run test`, `npm run lint` y `npm run build` en verde.

---

## 6. Migración de datos

Ejecutar en PostgreSQL:

```sql
UPDATE notes
SET content_json = (
  SELECT jsonb_agg(jsonb_build_object('text', key, 'checked', value) ORDER BY ord)
  FROM jsonb_each(content_json) WITH ORDINALITY AS t(key, value, ord)
)
WHERE checklist_mode = true AND content_json IS NOT NULL;
```

No se agrega compatibilidad con el formato antiguo: se asume entorno de desarrollo.
