import { notesCopy } from '../model/copy'
import { PlusIcon } from './icons'

export function CaptureBar({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-box border border-base-300 bg-base-200 p-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
        <PlusIcon />
      </span>
      <span className="flex-1 text-base font-medium text-neutral">
        {notesCopy.placeholders.captureBar}
      </span>
      <span className="hidden shrink-0 text-sm font-medium text-primary sm:block">
        {notesCopy.actions.newNote}
      </span>
    </button>
  )
}
