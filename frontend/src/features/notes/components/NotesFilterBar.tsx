import { notesCopy } from '../model/copy'
import { frequentOptions } from '../model/filters'
import type { TagOption } from '../model/filters'
import { ClockIcon, ResetIcon, TagIcon, TagsIcon } from './icons'
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery'

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

function pillClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition shrink-0 ${
    active
      ? 'border-primary/20 bg-primary/10 text-primary'
      : 'border-base-300 bg-base-200 text-base-content hover:bg-base-300'
  }`
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
  const isDesktop = useMediaQuery('(min-width: 640px)')

  return (
    <div className="mb-4 flex flex-col gap-2">
      {isDesktop ? (
        <div
          role="group"
          aria-label={notesCopy.filters.label}
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            className={pillClass(active)}
            aria-label={notesCopy.filters.all}
            title={notesCopy.filters.all}
            onClick={onClear}
          >
            <ResetIcon />
            <span className="hidden sm:inline">{notesCopy.filters.all}</span>
          </button>
          <button
            type="button"
            className={pillClass(reminderOnly)}
            aria-pressed={reminderOnly}
            onClick={onToggleReminder}
          >
            <ClockIcon />
            <span>{notesCopy.filters.reminder}</span>
          </button>

          {tagsStatus === 'ready'
            ? frequent.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={pillClass(tagIds.includes(tag.id))}
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
              className={pillClass(false)}
              aria-label={notesCopy.filters.viewAll}
              title={notesCopy.filters.viewAll}
              onClick={onOpenSheet}
            >
              <TagsIcon />
              <span className="hidden sm:inline">{notesCopy.filters.viewAll}</span>
            </button>
          ) : null}
        </div>
      ) : (
        <div
          role="group"
          aria-label={notesCopy.filters.label}
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            className={pillClass(active)}
            aria-label={notesCopy.filters.all}
            title={notesCopy.filters.all}
            onClick={onClear}
          >
            <ResetIcon />
            <span>{notesCopy.filters.all}</span>
          </button>
          <button
            type="button"
            className={pillClass(reminderOnly)}
            aria-pressed={reminderOnly}
            onClick={onToggleReminder}
          >
            <ClockIcon />
            <span>{notesCopy.filters.reminder}</span>
          </button>

          {tagsStatus === 'ready' && options.length > 0 ? (
            <button
              type="button"
              className={pillClass(tagIds.length > 0)}
              aria-label={notesCopy.labels.tags}
              onClick={onOpenSheet}
            >
              <TagsIcon />
              <span>{notesCopy.labels.tags}</span>
              {tagIds.length > 0 ? (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-content">
                  {tagIds.length}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      )}

      {tagsStatus === 'error' ? (
        <div className="flex items-center gap-2">
          <p role="alert" className="text-sm text-error">
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
