type Tone = 'neutral' | 'go' | 'caution' | 'stop' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'bg-concrete text-asphalt border-line',
  go: 'bg-go-bg text-go border-go',
  caution: 'bg-caution-bg text-asphalt border-caution',
  stop: 'bg-stop-bg text-stop border-stop',
  info: 'bg-info-bg text-pit border-pit',
}

export function StatusPill({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border-2 px-3 py-0.5 text-sm font-bold whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
