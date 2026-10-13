import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { useAuth } from '../../auth/context/useAuth'
import { authCopy } from '../../auth/model/copy'
import { HomeHeader } from '../../home/components/HomeHeader'
import { createNote, updateNote } from '../api/notesApi'
import { createTag, listTags } from '../api/tagsApi'
import { NoteEditor } from '../components/NoteEditor'
import { NotesPanel } from '../components/NotesPanel'
import { PanelSwitch } from '../components/PanelSwitch'
import { ViewModeToggle } from '../components/ViewModeToggle'
import { useNotes } from '../hooks/useNotes'
import { notesCopy } from '../model/copy'
import { splitByGroup } from '../model/grouping'
import type {
  CreateNotePayload,
  Note,
  Panel,
  Tag,
  UpdateNotePayload,
  ViewMode,
} from '../model/types'
import { readViewMode, writeViewMode } from '../model/viewPreference'

export type NotesPageMode = 'list' | 'new' | 'edit'

export function NotesPage({ mode }: { mode: NotesPageMode }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { uuid } = useParams()
  const { notes, loading, error, reload, setPinned, archive, remove, reorder, setChecklistItemChecked } =
    useNotes()
  const [tags, setTags] = useState<Tag[]>([])
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode(window.localStorage))
  const [panel, setPanel] = useState<Panel>('main')

  function changeView(mode: ViewMode) {
    writeViewMode(window.localStorage, mode)
    setViewMode(mode)
  }

  useEffect(() => {
    listTags()
      .then(setTags)
      .catch(() => setTags([]))
  }, [])

  const groups = useMemo(() => splitByGroup(notes), [notes])
  const editingNote = useMemo(
    () => (mode === 'edit' && uuid ? notes.find((note) => note.uuidNote === uuid) ?? null : null),
    [mode, uuid, notes],
  )

  const handleSave = useCallback(
    async (payload: CreateNotePayload | UpdateNotePayload) => {
      if (mode === 'edit' && uuid) {
        await updateNote(uuid, payload as UpdateNotePayload)
      } else {
        await createNote(payload as CreateNotePayload)
      }
      await reload()
      navigate('/home')
    },
    [mode, uuid, reload, navigate],
  )

  const handleCreateTag = useCallback(async (name: string) => {
    const tag = await createTag(name)
    setTags((prev) => [...prev, tag])
    return tag
  }, [])

  const handleTogglePin = useCallback(
    (note: Note) => {
      void setPinned(note.uuidNote, note.isArchived ? true : !note.isPinned)
    },
    [setPinned],
  )

  const handleArchive = useCallback(
    (note: Note) => {
      void archive(note.uuidNote)
    },
    [archive],
  )

  const handleRestore = useCallback(
    (note: Note) => {
      void setPinned(note.uuidNote, false)
    },
    [setPinned],
  )

  async function confirmDelete() {
    if (!pendingDelete) return
    const ok = await remove(pendingDelete.uuidNote)
    setPendingDelete(null)
    if (ok && mode === 'edit') {
      navigate('/home')
    }
  }

  return (
    <div className="min-h-dvh">
      <HomeHeader
        title={authCopy.titles.userHome}
        userName={user?.name ?? ''}
        onLogout={() => void signOut()}
      />
      <main className="mx-auto w-full p-4 pb-24 lg:pb-6 min-[2560px]:w-[90%]">
        {mode === 'list' ? (
          <>
            <div className="relative mb-3 flex items-center justify-between gap-2">
              <ViewModeToggle mode={viewMode} onChange={changeView} />
              <button
                type="button"
                className="btn btn-primary absolute left-1/2 hidden -translate-x-1/2 lg:inline-flex"
                onClick={() => navigate('/home/new')}
              >
                {notesCopy.actions.newNote}
              </button>
              <PanelSwitch panel={panel} onChange={setPanel} />
            </div>
            <NotesPanel
              title={panel === 'main' ? notesCopy.titles.notes : notesCopy.sections.archived}
              sections={
                panel === 'main'
                  ? [
                      {
                        id: 'pinned',
                        title: notesCopy.sections.pinned,
                        notes: groups.pinned,
                        reorderEnabled: true,
                      },
                      {
                        id: 'others',
                        title: notesCopy.sections.others,
                        notes: groups.others,
                        reorderEnabled: true,
                      },
                    ]
                  : [
                      {
                        id: 'archived',
                        title: '',
                        notes: groups.archived,
                        reorderEnabled: false,
                      },
                    ]
              }
              viewMode={viewMode}
              loading={loading}
              error={error}
              emptyTitle={panel === 'main' ? notesCopy.empty.notesTitle : notesCopy.empty.archivedTitle}
              emptyMessage={
                panel === 'main' ? notesCopy.empty.notesMessage : notesCopy.empty.archivedMessage
              }
              onRetry={() => void reload()}
              onOpen={(note) => navigate(`/home/${note.uuidNote}`)}
              onTogglePin={handleTogglePin}
              onArchive={handleArchive}
              onRestore={handleRestore}
              onDelete={(note) => setPendingDelete(note)}
              onReorder={(uuidNote, payload) => void reorder(uuidNote, payload)}
              onToggleChecklistItem={(note, item, checked) =>
                void setChecklistItemChecked(note.uuidNote, item, checked)
              }
            />
          </>
        ) : (
          <NoteEditor
            key={mode === 'edit' ? (editingNote?.uuidNote ?? 'loading') : 'new'}
            note={mode === 'edit' ? editingNote : null}
            tags={tags}
            onSave={handleSave}
            onCreateTag={handleCreateTag}
            onCancel={() => navigate('/home')}
          />
        )}
      </main>

      {mode === 'list' ? (
        <button
          type="button"
          aria-label={notesCopy.actions.newNote}
          className="btn btn-primary btn-circle btn-lg fixed bottom-6 left-1/2 z-50 -translate-x-1/2 lg:hidden"
          onClick={() => navigate('/home/new')}
        >
          +
        </button>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={notesCopy.confirm.deleteTitle}
        message={notesCopy.confirm.deleteMessage}
        confirmLabel={notesCopy.actions.confirm}
        cancelLabel={notesCopy.actions.cancel}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
