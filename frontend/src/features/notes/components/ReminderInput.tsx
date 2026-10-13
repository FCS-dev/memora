import { IconButton } from '../../../shared/components/IconButton'
import { notesCopy } from '../model/copy'
import { CrossIcon } from './icons'

export interface ReminderInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

export function ReminderInput({ id, label, value, onChange }: ReminderInputProps) {
  return (
    <div className="flex items-center gap-1">
      <label className="floating-label">
        <span>{label}</span>
        <input
          id={id}
          type="datetime-local"
          size={25}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder=" "
          className="input w-[25ch]"
        />
      </label>
      {value !== '' ? (
        <IconButton label={notesCopy.actions.clearReminder} onClick={() => onChange('')}>
          <CrossIcon />
        </IconButton>
      ) : null}
    </div>
  )
}
