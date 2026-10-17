import { notesCopy } from '../model/copy'
import type { ViewMode } from '../model/types'
import { CardIcon, ListIcon } from './icons'

export interface ViewModeToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

function buttonClass(active: boolean): string {
  return `inline-flex items-center justify-center rounded-md px-2.5 py-1.5 transition ${
    active ? 'bg-base-100 text-base-content shadow-sm' : 'text-neutral hover:text-base-content'
  }`
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div role="group" aria-label="Vista" className="inline-flex rounded-lg border border-base-300 bg-base-200 p-0.5">
      <button
        type="button"
        className={buttonClass(mode === 'card')}
        aria-pressed={mode === 'card'}
        aria-label={notesCopy.actions.viewCard}
        title={notesCopy.actions.viewCard}
        onClick={() => onChange('card')}
      >
        <CardIcon />
      </button>
      <button
        type="button"
        className={buttonClass(mode === 'list')}
        aria-pressed={mode === 'list'}
        aria-label={notesCopy.actions.viewList}
        title={notesCopy.actions.viewList}
        onClick={() => onChange('list')}
      >
        <ListIcon />
      </button>
    </div>
  )
}
