import { THEMES } from '../../theme/model/themes'
import { useTheme } from '../../theme/hooks/useTheme'
import { accountCopy } from '../model/copy'

export function ThemeMenu() {
  const { theme, setTheme } = useTheme()

  return (
    <ul role="menu" aria-label={accountCopy.menu.theme} className="menu">
      {THEMES.map((option) => {
        const active = theme === option
        return (
          <li key={option}>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={active}
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
