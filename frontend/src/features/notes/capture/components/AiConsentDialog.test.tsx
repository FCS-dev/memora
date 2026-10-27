import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AiConsentDialog } from './AiConsentDialog'
import { captureCopy } from '../model/copy'

describe('AiConsentDialog', () => {
  it('acepta el consentimiento', async () => {
    const onAccept = vi.fn()
    render(
      <AiConsentDialog
        open
        noticeVersion="1"
        onAccept={onAccept}
        onReject={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: captureCopy.consent.accept }))

    expect(onAccept).toHaveBeenCalledOnce()
    expect(screen.getByText(captureCopy.consent.body)).toBeInTheDocument()
  })

  it('rechaza el consentimiento', async () => {
    const onReject = vi.fn()
    render(
      <AiConsentDialog
        open
        noticeVersion="1"
        onAccept={vi.fn()}
        onReject={onReject}
        onClose={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: captureCopy.consent.reject }))

    expect(onReject).toHaveBeenCalledOnce()
  })

  it('cierra sin decidir con Escape', async () => {
    const onClose = vi.fn()
    render(
      <AiConsentDialog
        open
        noticeVersion="1"
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onClose={onClose}
      />,
    )

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })
})
