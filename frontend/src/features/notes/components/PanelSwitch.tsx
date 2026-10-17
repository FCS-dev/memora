import { notesCopy } from '../model/copy'
import type { Panel } from '../model/types'

export interface PanelSwitchProps {
  panel: Panel
  onChange: (panel: Panel) => void
}

function buttonClass(active: boolean): string {
  return `px-3 py-1.5 text-sm font-medium transition ${
    active ? 'bg-base-100 text-base-content shadow-sm' : 'text-neutral hover:text-base-content'
  }`
}

export function PanelSwitch({ panel, onChange }: PanelSwitchProps) {
  return (
    <div role="group" aria-label="Panel" className="inline-flex overflow-hidden rounded-lg border border-base-300 bg-base-200 p-0.5">
      <button
        type="button"
        className={`rounded-md ${buttonClass(panel === 'main')}`}
        aria-pressed={panel === 'main'}
        onClick={() => onChange('main')}
      >
        {notesCopy.panels.notes}
      </button>
      <button
        type="button"
        className={`rounded-md ${buttonClass(panel === 'archived')}`}
        aria-pressed={panel === 'archived'}
        onClick={() => onChange('archived')}
      >
        {notesCopy.panels.archived}
      </button>
    </div>
  )
}
