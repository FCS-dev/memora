import { notesCopy } from '../model/copy'
import type { ViewMode } from '../model/types'
import { CardIcon, ListIcon } from './icons'

export interface ViewModeToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div role="group" aria-label="Vista" className="join">
      <button
        type="button"
        className="btn btn-sm join-item"
        aria-pressed={mode === 'card'}
        aria-label={notesCopy.actions.viewCard}
        title={notesCopy.actions.viewCard}
        onClick={() => onChange('card')}
      >
        <CardIcon />
      </button>
      <button
        type="button"
        className="btn btn-sm join-item"
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
