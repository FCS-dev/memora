import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { subscribeTagsChanged } from '../../../shared/lib/events'
import { HomeHeader } from '../../home/components/HomeHeader'
import { createNote, updateNote } from '../api/notesApi'
import { createTag, listTags } from '../api/tagsApi'
import { CaptureBar } from '../components/CaptureBar'
import { CaptureFlow } from '../capture/components/CaptureFlow'
import { NoteEditor } from '../components/NoteEditor'
import { NotesFilterBar } from '../components/NotesFilterBar'
import { PlusIcon } from '../components/icons'
import type { TagsStatus } from '../components/NotesFilterBar'
import { NotesPanel } from '../components/NotesPanel'
import { PanelSwitch } from '../components/PanelSwitch'
import { TagFilterSheet } from '../components/TagFilterSheet'
import { ViewModeToggle } from '../components/ViewModeToggle'
import { useNotes } from '../hooks/useNotes'
import { useNotesFilter } from '../hooks/useNotesFilter'
import { notesCopy } from '../model/copy'
import { buildTagOptions, filterNotes, isFilterActive, resolveSelectedNames } from '../model/filters'
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
  const navigate = useNavigate()
  const location = useLocation()
  const { uuid } = useParams()
  const manualText = (location.state as { manualText?: string } | null)?.manualText ?? ''
  const { notes, loading, error, reload, setPinned, archive, remove, reorder, setChecklistItemChecked } =
    useNotes()
  const { reminderOnly, tagIds, toggleReminder, toggleTag, pruneTags, clearTags, clear } =
    useNotesFilter()
  const [tags, setTags] = useState<Tag[]>([])
  const [tagsStatus, setTagsStatus] = useState<TagsStatus>('loading')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => readViewMode(window.localStorage))
  const [panel, setPanel] = useState<Panel>('main')
  const [captureBarInView, setCaptureBarInView] = useState(true)
  const captureBarRef = useRef<HTMLDivElement>(null)

  function changeView(mode: ViewMode) {
    writeViewMode(window.localStorage, mode)
    setViewMode(mode)
  }

  const loadTags = useCallback(() => {
    setTagsStatus('loading')
    listTags()
      .then((result) => {
        setTags(result)
        setTagsStatus('ready')
      })
      .catch(() => setTagsStatus('error'))
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    const element = captureBarRef.current
    if (!element || typeof IntersectionObserver === 'undefined') {
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCaptureBarInView(entry.isIntersecting)
      },
      { threshold: 0 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(
    () =>
      subscribeTagsChanged(() => {
        loadTags()
        if (mode === 'list') {
          void reload()
        }
      }),
    [loadTags, mode, reload],
  )

  const options = useMemo(() => buildTagOptions(notes, tags), [notes, tags])
  const active = isFilterActive({ reminderOnly, tagIds })
  const selectedNames = resolveSelectedNames(tagIds, options)
  const visibleNotes = active
    ? filterNotes(notes, { reminderOnly, tagNames: selectedNames })
    : notes
  const groups = useMemo(() => splitByGroup(visibleNotes), [visibleNotes])

  useEffect(() => {
    pruneTags(options)
  }, [options, pruneTags])

  const editingNote = useMemo(
    () => (mode === 'edit' && uuid ? notes.find((note) => note.uuidNote === uuid) ?? null : null),
    [mode, uuid, notes],
  )

  const emptyTitle = active
    ? reminderOnly
      ? notesCopy.empty.filterReminderTitle
      : notesCopy.empty.filterTagsTitle
    : panel === 'main'
      ? notesCopy.empty.notesTitle
      : notesCopy.empty.archivedTitle

  const emptyMessage = active
    ? reminderOnly && tagIds.length > 0
      ? notesCopy.empty.filterBothMessage
      : reminderOnly
        ? notesCopy.empty.filterReminderMessage
        : notesCopy.empty.filterTagsMessage
    : panel === 'main'
      ? notesCopy.empty.notesMessage
      : notesCopy.empty.archivedMessage

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
    const result = await createTag(name)
    setTags((prev) =>
      prev.some((tag) => tag.id === result.tag.id) ? prev : [...prev, result.tag],
    )
    return result
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
      <HomeHeader />
      <main className={`mx-auto w-full max-w-7xl p-4 lg:pb-8 ${captureBarInView ? 'pb-8' : 'pb-28'}`}>
        {mode === 'list' ? (
          <>
            <div ref={captureBarRef}>
              <CaptureBar onOpen={() => setCaptureOpen(true)} />
            </div>

            <div className="mb-3 mt-4 flex items-center justify-between gap-2">
              <ViewModeToggle mode={viewMode} onChange={changeView} />
              <PanelSwitch panel={panel} onChange={setPanel} />
            </div>

            <NotesFilterBar
              reminderOnly={reminderOnly}
              tagIds={tagIds}
              options={options}
              tagsStatus={tagsStatus}
              onToggleReminder={toggleReminder}
              onToggleTag={toggleTag}
              onClear={clear}
              onOpenSheet={() => setSheetOpen(true)}
              onRetryTags={loadTags}
            />

            <NotesPanel
              title={panel === 'main' ? notesCopy.titles.notes : notesCopy.sections.archived}
              sections={
                panel === 'main'
                  ? [
                      {
                        id: 'pinned',
                        title: notesCopy.sections.pinned,
                        notes: groups.pinned,
                        reorderEnabled: !active,
                      },
                      {
                        id: 'others',
                        title: notesCopy.sections.others,
                        notes: groups.others,
                        reorderEnabled: !active,
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
              emptyTitle={emptyTitle}
              emptyMessage={emptyMessage}
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
            initialText={mode === 'new' ? manualText : undefined}
            onSave={handleSave}
            onCreateTag={handleCreateTag}
            onCancel={() => navigate('/home')}
          />
        )}
      </main>

      {mode === 'list' && !captureBarInView && !captureOpen ? (
        <button
          type="button"
          aria-label={notesCopy.actions.newNote}
          className="btn btn-primary fixed bottom-6 left-1/2 z-50 h-12 -translate-x-1/2 rounded-full px-5 shadow-lg transition-opacity duration-200 lg:hidden"
          onClick={() => setCaptureOpen(true)}
        >
          <PlusIcon />
          {notesCopy.actions.newNote}
        </button>
      ) : null}

      {mode === 'list' ? (
        <CaptureFlow
          open={captureOpen}
          tags={tags}
          tagsStatus={tagsStatus}
          onClose={() => setCaptureOpen(false)}
          onManual={(text) => {
            setCaptureOpen(false)
            navigate('/home/new', { state: { manualText: text } })
          }}
          onCreateTag={handleCreateTag}
          onSave={handleSave}
        />
      ) : null}

      <TagFilterSheet
        open={sheetOpen}
        options={options}
        tagIds={tagIds}
        onToggleTag={toggleTag}
        onClear={clearTags}
        onClose={() => setSheetOpen(false)}
      />

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
