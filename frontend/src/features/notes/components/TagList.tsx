import { useLayoutEffect, useRef, useState } from 'react'
import { hasOverflow } from '../model/tags'

export interface TagListProps {
  tags: string[]
}

export function TagList({ tags }: TagListProps) {
  const ref = useRef<HTMLUListElement>(null)
  const [overflow, setOverflow] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }
    const update = () => setOverflow(hasOverflow(element.scrollWidth, element.clientWidth))
    update()
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [tags])

  return (
    <div className="relative">
      <ul ref={ref} className="flex flex-nowrap gap-1.5 overflow-hidden">
        {tags.map((tag) => (
          <li key={tag} className="badge badge-md bg-base-300 text-base-content">
            {tag}
          </li>
        ))}
      </ul>
      {overflow ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-base-200 pl-2 text-neutral"
        >
          ...
        </span>
      ) : null}
    </div>
  )
}
