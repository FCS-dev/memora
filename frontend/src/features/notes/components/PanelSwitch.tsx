import { notesCopy } from '../model/copy'
import type { Panel } from '../model/types'

export interface PanelSwitchProps {
  panel: Panel
  onChange: (panel: Panel) => void
}

export function PanelSwitch({ panel, onChange }: PanelSwitchProps) {
  return (
    <div role="group" aria-label="Panel" className="join">
      <button
        type="button"
        className="btn btn-sm join-item"
        aria-pressed={panel === 'main'}
        onClick={() => onChange('main')}
      >
        {notesCopy.panels.notes}
      </button>
      <button
        type="button"
        className="btn btn-sm join-item"
        aria-pressed={panel === 'archived'}
        onClick={() => onChange('archived')}
      >
        {notesCopy.panels.archived}
      </button>
    </div>
  )
}
