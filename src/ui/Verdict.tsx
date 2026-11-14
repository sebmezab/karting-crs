import type { ReactNode } from 'react'
import { IconAlert, IconCheck, IconShield, IconStop } from './icons'

export type VerdictTone = 'ok' | 'warning' | 'blocked' | 'overridden'

const TONES: Record<VerdictTone, { box: string; icon: ReactNode }> = {
  ok: { box: 'bg-go text-white', icon: <IconCheck size={40} /> },
  warning: { box: 'bg-caution text-asphalt', icon: <IconAlert size={40} /> },
  blocked: { box: 'bg-stop text-white', icon: <IconStop size={40} /> },
  overridden: { box: 'bg-pit text-white', icon: <IconShield size={40} /> },
}

/**
 * Semáforo de validación a ancho completo (verde/ámbar/rojo + ícono + texto): se lee de un
 * vistazo, al sol y sin depender solo del color.
 */
export function Verdict({
  tone,
  title,
  messages,
  children,
}: {
  tone: VerdictTone
  title: string
  messages: string[]
  children?: ReactNode
}) {
  const t = TONES[tone]
  return (
    <section
      role="status"
      aria-live="polite"
      data-verdict={tone}
      className={`animate-verdict rounded-xl p-5 ${t.box}`}
    >
      <div className="flex items-center gap-3">
        {t.icon}
        <h2 className="font-display text-3xl leading-tight font-extrabold">{title}</h2>
      </div>
      {messages.length > 0 && (
        <ul className="mt-3 space-y-2 text-lg leading-snug">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}
