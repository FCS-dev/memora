import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { Spinner } from '../../../shared/components/Spinner'
import { TextField } from '../../../shared/components/TextField'
import {
  createGlobalTag,
  deleteGlobalTag,
  listGlobalTags,
  renameGlobalTag,
} from '../api/adminTagsApi'
import { adminTagsCopy } from '../model/copy'
import { mapAdminTagsError } from '../model/errors'
import type { GlobalTag } from '../model/types'

function byName(a: GlobalTag, b: GlobalTag): number {
  return a.tagName.localeCompare(b.tagName)
}

export function GlobalTagsPanel() {
  const [tags, setTags] = useState<GlobalTag[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<GlobalTag | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setTags(await listGlobalTags())
    } catch (error) {
      setLoadError(mapAdminTagsError(error, 'load'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submitCreate() {
    const name = newName.trim()
    if (name === '' || creating) {
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const created = await createGlobalTag(name)
      setTags((current) => [...current, created].sort(byName))
      setNewName('')
    } catch (error) {
      setCreateError(mapAdminTagsError(error, 'save'))
    } finally {
      setCreating(false)
    }
  }

  function startEdit(tag: GlobalTag) {
    setEditingId(tag.id)
    setEditName(tag.tagName)
    setRenameError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setRenameError(null)
  }

  async function submitRename() {
    if (editingId === null) {
      return
    }
    const name = editName.trim()
    if (name === '' || renaming) {
      return
    }
    setRenaming(true)
    setRenameError(null)
    try {
      const updated = await renameGlobalTag(editingId, name)
      setTags((current) => current.map((tag) => (tag.id === updated.id ? updated : tag)).sort(byName))
      cancelEdit()
    } catch (error) {
      setRenameError(mapAdminTagsError(error, 'save'))
    } finally {
      setRenaming(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }
    setDeleteError(null)
    try {
      await deleteGlobalTag(pendingDelete.id)
      setTags((current) => current.filter((tag) => tag.id !== pendingDelete.id))
    } catch (error) {
      setDeleteError(mapAdminTagsError(error, 'delete'))
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-2 py-4" aria-labelledby="global-tags-title">
      <h2 id="global-tags-title" className="text-lg font-semibold">
        {adminTagsCopy.title}
      </h2>
      <p className="text-sm text-base-content/70">{adminTagsCopy.description}</p>

      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void submitCreate()
        }}
      >
        <div className="flex-1">
          <TextField
            id="new-global-tag"
            label={adminTagsCopy.labels.newTag}
            value={newName}
            onChange={setNewName}
            disabled={creating}
            placeholder={adminTagsCopy.placeholders.newTag}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={creating || newName.trim() === ''}>
          {adminTagsCopy.actions.create}
        </button>
      </form>
      {createError ? (
        <p role="alert" className="text-error mt-2 text-sm">
          {createError}
        </p>
      ) : null}

      {loadError ? <ErrorAlert message={loadError} /> : null}
      {loading ? <Spinner /> : null}

      {!loading && !loadError && tags.length === 0 ? (
        <div className="mt-6 text-center text-base-content/70">
          <p className="font-medium">{adminTagsCopy.empty.title}</p>
          <p className="text-sm">{adminTagsCopy.empty.message}</p>
        </div>
      ) : null}

      {tags.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {tags.map((tag) => (
            <li key={tag.id} className="rounded-box flex flex-wrap items-center gap-2 bg-base-200 p-2">
              {editingId === tag.id ? (
                <>
                  <div className="min-w-40 flex-1">
                    <TextField
                      id={`rename-${tag.id}`}
                      label={adminTagsCopy.labels.rename}
                      value={editName}
                      onChange={setEditName}
                      disabled={renaming}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={renaming || editName.trim() === ''}
                    onClick={() => void submitRename()}
                  >
                    {adminTagsCopy.actions.save}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={cancelEdit}>
                    {adminTagsCopy.actions.cancel}
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{tag.tagName}</span>
                  <span className="badge badge-ghost">
                    {tag.noteCount} {adminTagsCopy.labels.count}
                  </span>
                  <button type="button" className="btn btn-sm" onClick={() => startEdit(tag)}>
                    {adminTagsCopy.actions.rename}
                  </button>
                  <button
                    type="button"
                    className="btn btn-error btn-sm"
                    onClick={() => setPendingDelete(tag)}
                  >
                    {adminTagsCopy.actions.delete}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {renameError ? (
        <p role="alert" className="text-error mt-2 text-sm">
          {renameError}
        </p>
      ) : null}
      {deleteError ? (
        <p role="alert" className="text-error mt-2 text-sm">
          {deleteError}
        </p>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={adminTagsCopy.confirm.deleteTitle}
        message={adminTagsCopy.confirm.deleteMessage}
        confirmLabel={adminTagsCopy.actions.delete}
        cancelLabel={adminTagsCopy.actions.cancel}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  )
}
