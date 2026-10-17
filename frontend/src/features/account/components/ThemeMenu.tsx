import { THEMES } from '../../theme/model/themes'
import { useTheme } from '../../theme/hooks/useTheme'
import { accountCopy } from '../model/copy'

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()

  return (
    <ul role="group" aria-label={accountCopy.menu.theme} className="menu mt-1 rounded-lg bg-base-300 p-1">
      {THEMES.map((option) => {
        const active = theme === option
        return (
          <li key={option}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={active}
              className={`rounded-md ${active ? 'bg-base-100 font-medium' : ''}`}
              onClick={() => setTheme(option)}
            >
              <span className="flex-1">{accountCopy.theme.options[option]}</span>
              {active ? <span aria-hidden="true">✓</span> : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
