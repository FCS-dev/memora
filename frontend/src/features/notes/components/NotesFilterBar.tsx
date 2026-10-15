import { notesCopy } from '../model/copy'
import { frequentOptions } from '../model/filters'
import type { TagOption } from '../model/filters'
import { ClockIcon, ResetIcon, TagIcon, TagsIcon } from './icons'

export type TagsStatus = 'loading' | 'ready' | 'error'

export interface NotesFilterBarProps {
  reminderOnly: boolean
  tagIds: number[]
  options: TagOption[]
  tagsStatus: TagsStatus
  onToggleReminder: () => void
  onToggleTag: (id: number) => void
  onClear: () => void
  onOpenSheet: () => void
  onRetryTags: () => void
}

function chipClass(active: boolean): string {
  return `btn btn-sm shrink-0 ${active ? 'btn-primary' : 'btn-ghost'}`
}

export function NotesFilterBar({
  reminderOnly,
  tagIds,
  options,
  tagsStatus,
  onToggleReminder,
  onToggleTag,
  onClear,
  onOpenSheet,
  onRetryTags,
}: NotesFilterBarProps) {
  const active = reminderOnly || tagIds.length > 0
  const frequent = frequentOptions(options)

  return (
    <div className="mb-3 flex flex-col gap-2">
      <div
        role="group"
        aria-label={notesCopy.filters.label}
        className="flex items-center gap-2 overflow-x-auto pb-1"
      >
        <button
          type="button"
          className={chipClass(active)}
          aria-label={notesCopy.filters.all}
          title={notesCopy.filters.all}
          onClick={onClear}
        >
          <ResetIcon />
        </button>
        <button
          type="button"
          className={chipClass(reminderOnly)}
          aria-label={notesCopy.filters.reminder}
          title={notesCopy.filters.reminder}
          aria-pressed={reminderOnly}
          onClick={onToggleReminder}
        >
          <ClockIcon />
        </button>

        {tagsStatus === 'ready'
          ? frequent.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`${chipClass(tagIds.includes(tag.id))} gap-1`}
                aria-pressed={tagIds.includes(tag.id)}
                onClick={() => onToggleTag(tag.id)}
              >
                <TagIcon />
                <span>{tag.tagName}</span>
              </button>
            ))
          : null}

        {tagsStatus === 'ready' && options.length > 0 ? (
          <button
            type="button"
            className="btn btn-sm btn-outline shrink-0"
            aria-label={notesCopy.filters.viewAll}
            title={notesCopy.filters.viewAll}
            onClick={onOpenSheet}
          >
            <TagsIcon />
          </button>
        ) : null}
      </div>

      {tagsStatus === 'error' ? (
        <div className="flex items-center gap-2">
          <p role="alert" className="text-error text-sm">
            {notesCopy.filters.tagsError}
          </p>
          <button type="button" className="btn btn-xs" onClick={onRetryTags}>
            {notesCopy.filters.retryTags}
          </button>
        </div>
      ) : null}
    </div>
  )
}
