import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from './icons'

/** Diálogo modal nativo (<dialog>): foco atrapado y cierre con Escape sin librerías. */
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-white p-0 text-asphalt shadow-2xl backdrop:bg-asphalt/60"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-12 place-items-center rounded-lg hover:bg-concrete"
          aria-label="Cerrar"
        >
          <IconClose />
        </button>
      </div>
      <div className="p-4">{open && children}</div>
    </dialog>
  )
}
