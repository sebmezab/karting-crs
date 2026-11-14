import { useState } from 'react'
import { useQuery, useRepositories } from '@/data/DataProvider'
import type { EntrySummary } from '@/data/repositories'
import {
  normalizeSerial,
  TIRE_POSITIONS,
  type TirePosition,
  type TireSerials,
} from '@/domain/tires'
import { errorMessage, es, tireIssueMessage } from '@/i18n/es'
import { BarcodeScanner } from '@/ui/BarcodeScanner'
import { Button } from '@/ui/Button'
import { IconCamera } from '@/ui/icons'
import { Modal } from '@/ui/Modal'
import { InlineError } from '@/ui/Page'
import { Verdict } from '@/ui/Verdict'

const EMPTY: TireSerials = { FL: '', FR: '', RL: '', RR: '' }

export interface TireMarkingFormProps {
  entry: EntrySummary & { eventEntry: NonNullable<EntrySummary['eventEntry']> }
  eventId: string
  actorPersonId: string
  canRequestException: boolean
  initialSerials?: TireSerials
  onDone: () => void
}

/**
 * Marca los 4 slicks de un kart: escaneo o ingreso manual, validación inmediata en semáforo
 * (tabla SPEC 7.1), solicitud de excepción y guardado.
 */
export function TireMarkingForm({
  entry,
  eventId,
  actorPersonId,
  canRequestException,
  initialSerials,
  onDone,
}: TireMarkingFormProps) {
  const repos = useRepositories()
  const [serials, setSerials] = useState<TireSerials>(initialSerials ?? EMPTY)
  const [brandModelMismatch, setBrandModelMismatch] = useState(false)
  const [usedConfirmed, setUsedConfirmed] = useState(false)
  const [scanning, setScanning] = useState<TirePosition | null>(null)
  const [scanNote, setScanNote] = useState('')
  const [scanRound, setScanRound] = useState(0)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const eventEntryId = entry.eventEntry.id
  const complete = TIRE_POSITIONS.every((p) => normalizeSerial(serials[p]) !== '')

  // Se re-valida con cada cambio de seriales y ante cambios en los datos (p.ej. el comisario
  // aprueba una excepción desde otro dispositivo).
  const validation = useQuery(
    async (r) =>
      complete
        ? r.tires.validate({ eventId, eventEntryId, scanned: serials, brandModelMismatch })
        : null,
    [
      eventId,
      eventEntryId,
      complete,
      serials.FL,
      serials.FR,
      serials.RL,
      serials.RR,
      brandModelMismatch,
    ],
  )
  const exceptions = useQuery(
    async (r) =>
      (await r.exceptions.listForEvent(eventId)).filter((x) => x.eventEntryId === eventEntryId),
    [eventId, eventEntryId],
  )

  const result = complete ? validation.data : null
  const mismatch = result?.issues.some((i) => i.code === 'serial_mismatch_continuation') ?? false
  // Cada excepción cubre un neumático: se puede pedir otra mientras no haya una pendiente.
  const pendingPuncture = exceptions.data?.find(
    (x) => x.type === 'puncture_replacement' && x.status === 'pending',
  )
  const rejectedPunctures =
    exceptions.data?.filter((x) => x.type === 'puncture_replacement' && x.status === 'rejected')
      .length ?? 0
  const canSave =
    !!result && result.status !== 'blocked' && (!result.needsUsedTiresConfirmation || usedConfirmed)

  function setSerial(position: TirePosition, value: string) {
    setSaved(false)
    setSaveError('')
    setSerials((s) => ({ ...s, [position]: value }))
  }

  function onScanned(raw: string) {
    if (!scanning) return
    const serial = normalizeSerial(raw)
    const duplicateAt = TIRE_POSITIONS.find(
      (p) => p !== scanning && normalizeSerial(serials[p]) === serial,
    )
    if (!serial || duplicateAt) {
      setScanNote(
        duplicateAt
          ? `Ese código ya está en ${es.tirePosition[duplicateAt]}. Escanea el siguiente neumático.`
          : 'Código vacío.',
      )
      setScanRound((n) => n + 1)
      return
    }
    const next = { ...serials, [scanning]: serial }
    setSerial(scanning, serial)
    setScanNote('')
    const nextEmpty = TIRE_POSITIONS.find((p) => normalizeSerial(next[p]) === '')
    setScanning(nextEmpty ?? null)
    setScanRound((n) => n + 1)
  }

  async function requestException() {
    setBusy(true)
    try {
      const positions = result?.issues
        .filter((i) => i.position)
        .map((i) => i.position)
        .join(', ')
      await repos.exceptions.request({
        eventId,
        eventEntryId,
        type: 'puncture_replacement',
        description: `Reemplazo de neumático ${positions} por pinchazo (kart #${entry.championshipEntry.kartNumber}).`,
        actorPersonId,
      })
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    setSaveError('')
    try {
      await repos.tires.save({
        eventId,
        eventEntryId,
        scanned: serials,
        brandModelMismatch,
        usedTiresConfirmed: usedConfirmed,
        actorPersonId,
      })
      setSaved(true)
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (saved && result) {
    return (
      <Verdict
        tone={result.status === 'warning' ? 'warning' : 'ok'}
        title="Marcación guardada"
        messages={[
          `Kart #${entry.championshipEntry.kartNumber}: ${TIRE_POSITIONS.map((p) => normalizeSerial(serials[p])).join(', ')}.`,
        ]}
      >
        <Button variant="secondary" size="lg" block onClick={onDone}>
          Marcar otro kart
        </Button>
      </Verdict>
    )
  }

  return (
    <div className="space-y-5">
      {/* Las 4 posiciones dispuestas como en el kart: adelante arriba, atrás abajo. */}
      <fieldset>
        <legend className="mb-2 font-bold">Seriales de los 4 slicks</legend>
        <div className="grid grid-cols-2 gap-3">
          {TIRE_POSITIONS.map((position) => (
            <div key={position} className="rounded-xl border-2 border-line bg-white p-3">
              <label
                htmlFor={`serial-${position}`}
                className="flex items-baseline justify-between gap-2"
              >
                <span className="font-display text-2xl font-extrabold">{position}</span>
                <span className="text-sm text-asphalt-soft">{es.tirePosition[position]}</span>
              </label>
              <input
                id={`serial-${position}`}
                value={serials[position]}
                onChange={(e) => setSerial(position, e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={40}
                placeholder="Serial"
                className="mt-2 h-12 w-full rounded-lg border-2 border-line px-3 font-display text-xl font-semibold tracking-wide uppercase focus:border-pit"
              />
              <button
                type="button"
                onClick={() => {
                  setScanNote('')
                  setScanning(position)
                }}
                className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-concrete font-bold hover:bg-line"
                aria-label={`Escanear ${es.tirePosition[position]}`}
              >
                <IconCamera size={20} /> Escanear
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      <label className="flex min-h-12 items-center gap-3 rounded-lg bg-white px-3">
        <input
          type="checkbox"
          checked={brandModelMismatch}
          onChange={(e) => setBrandModelMismatch(e.target.checked)}
          className="size-6 accent-pit"
        />
        <span>
          No corresponden a {entry.category.tireBrand} {entry.category.tireModel}
        </span>
      </label>

      {!complete && (
        <p className="rounded-lg border-2 border-dashed border-line p-4 text-asphalt-soft">
          Completa los 4 seriales para ver el resultado.
        </p>
      )}

      {result && (
        <Verdict
          tone={result.status}
          title={es.tireVerdict[result.status]}
          messages={result.issues.map(tireIssueMessage)}
        >
          {mismatch && canRequestException && (
            <div className="rounded-lg bg-white/15 p-3">
              {pendingPuncture ? (
                <p className="font-bold">
                  Excepción por pinchazo pendiente. Esperando al comisario.
                </p>
              ) : (
                <>
                  {rejectedPunctures > 0 && (
                    <p className="mb-2 font-bold">El comisario rechazó la excepción anterior.</p>
                  )}
                  <Button variant="secondary" block disabled={busy} onClick={requestException}>
                    Solicitar excepción por pinchazo
                  </Button>
                </>
              )}
            </div>
          )}
          {result.needsUsedTiresConfirmation && (
            <label className="flex min-h-12 items-center gap-3 rounded-lg bg-white/60 px-3 font-bold">
              <input
                type="checkbox"
                checked={usedConfirmed}
                onChange={(e) => setUsedConfirmed(e.target.checked)}
                className="size-6 accent-asphalt"
              />
              Confirmo que los 4 neumáticos son usados
            </label>
          )}
        </Verdict>
      )}

      {saveError && <InlineError>{saveError}</InlineError>}

      <Button size="lg" block disabled={!canSave || busy} onClick={save}>
        Guardar marcación
      </Button>

      <Modal
        open={scanning !== null}
        title={scanning ? `Escanear ${es.tirePosition[scanning]} (${scanning})` : ''}
        onClose={() => setScanning(null)}
      >
        <BarcodeScanner key={`${scanning}-${scanRound}`} onDetected={onScanned} />
        {scanNote && <p className="mt-2 font-bold text-stop">{scanNote}</p>}
      </Modal>
    </div>
  )
}
