import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let modalIdCounter = 0
const modalStack: number[] = []

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute('tabindex') !== '-1' &&
      element.getAttribute('aria-hidden') !== 'true',
  )
}

export interface UseModalBehaviorOptions {
  open: boolean
  containerRef: RefObject<HTMLElement | null>
  onClose: () => void
}

export function useModalBehavior({ open, containerRef, onClose }: UseModalBehaviorOptions) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const id = ++modalIdCounter
    modalStack.push(id)
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusContainer = () => container.focus({ preventScroll: true })
    const isTopmost = () => modalStack[modalStack.length - 1] === id

    focusContainer()

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost()) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        event.preventDefault()
        focusContainer()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      const focusIsInside = active !== null && container.contains(active)

      if (event.shiftKey) {
        if (!focusIsInside || active === first || active === container) {
          event.preventDefault()
          last.focus()
        }
      } else if (!focusIsInside || active === last || active === container) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)

      const index = modalStack.lastIndexOf(id)
      if (index !== -1) {
        modalStack.splice(index, 1)
      }

      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [open, containerRef])
}
