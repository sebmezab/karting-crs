import { useState } from 'react'
import { es } from '@/i18n/es'
import { Button } from '@/ui/Button'
import { IconMessage } from '@/ui/icons'
import { Modal } from '@/ui/Modal'

const FEEDBACK_EMAIL: string = import.meta.env.VITE_FEEDBACK_EMAIL ?? ''

/** Botón visible de comentarios durante las pruebas en terreno (SPEC §10). */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
    'Comentario demo campeonato',
  )}&body=${encodeURIComponent(`${text}\n\n(Página: ${window.location.hash})`)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setCopied(false)
        }}
        className="inline-flex min-h-12 items-center gap-2 rounded-lg border-2 border-white/40 px-3 font-bold text-white hover:bg-white/10"
      >
        <IconMessage size={20} />
        <span className="sm:hidden">{es.feedback.short}</span>
        <span className="hidden sm:inline">{es.feedback.title}</span>
      </button>
      <Modal open={open} title={es.feedback.title} onClose={() => setOpen(false)}>
        <p className="text-asphalt-soft">{es.feedback.intro}</p>
        <label className="mt-3 block font-bold" htmlFor="feedback-text">
          {es.feedback.label}
        </label>
        <textarea
          id="feedback-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border-2 border-line p-3 focus:border-pit"
        />
        {!FEEDBACK_EMAIL && <p className="mt-2 text-sm text-asphalt-soft">{es.feedback.noEmail}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {FEEDBACK_EMAIL && (
            <a
              href={mailto}
              className="inline-flex min-h-12 items-center rounded-lg bg-pit px-4 font-bold text-white"
            >
              {es.feedback.send}
            </a>
          )}
          <Button variant="secondary" onClick={copy} disabled={!text.trim()}>
            {es.feedback.copy}
          </Button>
        </div>
        {copied && (
          <p role="status" className="mt-3 font-bold text-go">
            {es.feedback.copied}
          </p>
        )}
      </Modal>
    </>
  )
}
