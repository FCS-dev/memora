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
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        className="input h-10 w-[22ch] text-sm"
      />
      {value !== '' ? (
        <IconButton label={notesCopy.actions.clearReminder} onClick={() => onChange('')}>
          <CrossIcon />
        </IconButton>
      ) : null}
    </div>
  )
}
