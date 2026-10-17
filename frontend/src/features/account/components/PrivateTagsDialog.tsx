import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog'
import { ErrorAlert } from '../../../shared/components/ErrorAlert'
import { Spinner } from '../../../shared/components/Spinner'
import { createTag, deleteTag, listTags, renameTag } from '../../notes/api/tagsApi'
import { mapTagError } from '../../notes/model/errors'
import { paginate, sortTagsByName } from '../../notes/model/tags'
import type { Tag } from '../../notes/model/types'
import { emitTagsChanged } from '../../../shared/lib/events'
import { accountCopy } from '../model/copy'
import { useModalBehavior } from '../../../shared/hooks/useModalBehavior'

const PAGE_SIZE = 5

export interface PrivateTagsDialogProps {
  open: boolean
  onClose: () => void
}

function validateTagName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed === '') {
    return accountCopy.errors.tagRequired
  }
  if (trimmed.length > 25) {
    return accountCopy.errors.tagTooLong
  }
  return null
}

function usageLabel(tag: Tag): string {
  return `${tag.tagName}: ${tag.noteCount} ${accountCopy.tags.usageSuffix}`
}

export function PrivateTagsDialog({ open, onClose }: PrivateTagsDialogProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [privates, setPrivates] = useState<Tag[]>([])
  const [globals, setGlobals] = useState<Tag[]>([])
  const [page, setPage] = useState(1)

  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createNotice, setCreateNotice] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useModalBehavior({ open, containerRef: modalRef, onClose })

  const load = useCallback(async () => {
    setStatus('loading')
    setLoadError('')
    try {
      const all = await listTags()
      setPrivates(sortTagsByName(all.filter((tag) => !tag.global)))
      setGlobals(all.filter((tag) => tag.global))
      setStatus('ready')
    } catch (error) {
      setLoadError(mapTagError(error))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    setNewName('')
    setCreateError(null)
    setCreateNotice(null)
    setRenameError(null)
    setDeleteError(null)
    setEditingId(null)
    setPage(1)
    void load()
  }, [open, load])

  if (!open) {
    return null
  }

  const pageData = paginate(privates, page, PAGE_SIZE)

  async function submitCreate() {
    const nameError = validateTagName(newName)
    if (nameError) {
      setCreateError(nameError)
      return
    }
    setCreating(true)
    setCreateError(null)
    setCreateNotice(null)
    try {
      const result = await createTag(newName.trim())
      setNewName('')
      if (result.reused) {
        setCreateNotice(accountCopy.tags.reusedNotice)
      }
      emitTagsChanged()
      setPage(1)
      await load()
    } catch (error) {
      setCreateError(mapTagError(error))
    } finally {
      setCreating(false)
    }
  }

  function startRename(tag: Tag) {
    setEditingId(tag.id)
    setEditName(tag.tagName)
    setRenameError(null)
  }

  function cancelRename() {
    setEditingId(null)
    setEditName('')
    setRenameError(null)
  }

  async function submitRename(tag: Tag) {
    const nameError = validateTagName(editName)
    if (nameError) {
      setRenameError(nameError)
      return
    }
    setRenameError(null)
    try {
      const renamed = await renameTag(tag.id, editName.trim())
      if (renamed.global) {
        emitTagsChanged({ merged: [{ fromId: tag.id, toId: renamed.id }], deleted: [tag.id] })
      } else {
        emitTagsChanged()
      }
      cancelRename()
      await load()
    } catch (error) {
      setRenameError(mapTagError(error))
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return
    }
    try {
      await deleteTag(pendingDelete.id)
      emitTagsChanged({ deleted: [pendingDelete.id] })
      setPendingDelete(null)
      await load()
    } catch (error) {
      setDeleteError(mapTagError(error))
      setPendingDelete(null)
    }
  }

  return createPortal(
    <>
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={accountCopy.tags.title}
        className="modal modal-open"
      >
        <div className="modal-box flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
          <h2 className="text-lg font-semibold">{accountCopy.tags.title}</h2>

          {status === 'loading' ? <Spinner /> : null}

          {status === 'error' ? (
            <>
              <ErrorAlert message={loadError} />
              <div className="modal-action">
                <button type="button" className="btn" onClick={onClose}>
                  {accountCopy.tags.close}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void load()}>
                  {accountCopy.tags.retry}
                </button>
              </div>
            </>
          ) : null}

          {status === 'ready' ? (
            <>
              <div className="flex items-end gap-2">
                <label className="floating-label flex-1">
                  <span>{accountCopy.tags.newTagLabel}</span>
                  <input
                    type="text"
                    value={newName}
                    disabled={creating}
                    placeholder={accountCopy.tags.newTagPlaceholder}
                    onChange={(event) => setNewName(event.target.value)}
                    className="input w-full"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={creating}
                  onClick={() => void submitCreate()}
                >
                  {accountCopy.tags.create}
                </button>
              </div>

              {createError ? <ErrorAlert message={createError} /> : null}
              {createNotice ? (
                <p role="status" className="text-info text-sm">
                  {createNotice}
                </p>
              ) : null}
              {renameError ? <ErrorAlert message={renameError} /> : null}
              {deleteError ? <ErrorAlert message={deleteError} /> : null}

              <section className="flex flex-col gap-2">
                {privates.length === 0 ? (
                  <p className="text-neutral">{accountCopy.tags.empty}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {pageData.pageItems.map((tag) => (
                      <li
                        key={tag.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-base-300 bg-base-200 p-2"
                      >
                        {editingId === tag.id ? (
                          <>
                            <input
                              type="text"
                              value={editName}
                              aria-label={`Renombrar etiqueta ${tag.tagName}`}
                              onChange={(event) => setEditName(event.target.value)}
                              className="input input-sm flex-1"
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              aria-label={`Guardar ${tag.tagName}`}
                              onClick={() => void submitRename(tag)}
                            >
                              {accountCopy.tags.save}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              aria-label={`Cancelar ${tag.tagName}`}
                              onClick={cancelRename}
                            >
                              {accountCopy.tags.cancel}
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium">{tag.tagName}</span>
                            <span
                              className="badge badge-md bg-base-300 text-neutral"
                              aria-label={usageLabel(tag)}
                            >
                              {tag.noteCount} {accountCopy.tags.usageSuffix}
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              aria-label={`Renombrar ${tag.tagName}`}
                              onClick={() => startRename(tag)}
                            >
                              {accountCopy.tags.rename}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-error"
                              aria-label={`Eliminar ${tag.tagName}`}
                              onClick={() => setPendingDelete(tag)}
                            >
                              {accountCopy.tags.delete}
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {pageData.pageCount > 1 ? (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={pageData.page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      {accountCopy.tags.previous}
                    </button>
                    <span className="text-sm text-neutral">
                      {accountCopy.tags.pagePrefix} {pageData.page} {accountCopy.tags.pageOf}{' '}
                      {pageData.pageCount}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={pageData.page >= pageData.pageCount}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      {accountCopy.tags.next}
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">{accountCopy.tags.globalSection}</h3>
                <ul className="flex flex-col gap-2">
                  {globals.map((tag) => (
                    <li
                      key={tag.id}
                      className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200 p-2"
                    >
                      <span className="flex-1 text-sm font-medium">{tag.tagName}</span>
                      <span className="badge badge-md bg-base-300 text-neutral">
                        {accountCopy.tags.globalBadge}
                      </span>
                      <span
                        className="badge badge-md bg-base-300 text-neutral"
                        aria-label={usageLabel(tag)}
                      >
                        {tag.noteCount} {accountCopy.tags.usageSuffix}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="modal-action">
                <button type="button" className="btn" onClick={onClose}>
                  {accountCopy.tags.close}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={accountCopy.tags.confirmDeleteTitle}
        message={accountCopy.tags.confirmDeleteMessage}
        confirmLabel={accountCopy.tags.delete}
        cancelLabel={accountCopy.tags.cancel}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>,
    document.body,
  )
}
