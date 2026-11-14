import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RequireAccess } from '@/app/Layout'
import { useSession } from '@/app/session'
import { useQuery, useRepositories } from '@/data/DataProvider'
import type { EventEntry } from '@/data/types'
import { validateEquipmentDeclaration } from '@/domain/equipment'
import { computeLateFee } from '@/domain/registration'
import { equipmentIssueMessage, errorMessage, es } from '@/i18n/es'
import { formatClp, formatDateTime, formatDay } from '@/lib/format'
import { Button } from '@/ui/Button'
import { KartPlate } from '@/ui/KartPlate'
import { InlineError, Loading, LoadError, PageHeader, Panel } from '@/ui/Page'
import { StatusPill } from '@/ui/StatusPill'
import { Verdict } from '@/ui/Verdict'
import { useDriver } from './useDriver'

/** Pantalla 6: inscripción a una fecha con el equipo declarado (SPEC 7.2 y 7.3). */
export function EventRegistrationPage() {
  const session = useSession()
  const repos = useRepositories()
  const driver = useDriver()
  const [selected, setSelected] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<EventEntry | null>(null)
  const [busy, setBusy] = useState(false)

  const ceId = driver.data?.championshipEntry?.id ?? ''
  const usedByOthers = useQuery(
    async (r) =>
      ceId ? r.equipment.usedByOtherDrivers(session.eventId, ceId) : new Map<string, string>(),
    [session.eventId, ceId],
  )

  if (session.persona.key !== 'driver') return <RequireAccess allowed={false}>{null}</RequireAccess>
  if (driver.error) return <LoadError onRetry={driver.reload} />
  if (!driver.data || !usedByOthers.data) return <Loading />

  const { overview, championshipEntry, category, equipment, eventEntries } = driver.data
  const event = overview.events.find((e) => e.id === session.eventId)
  if (!event || !championshipEntry || !category) return <Loading />

  const rules = overview.championship.rules
  const existing = eventEntries.find((e) => e.eventId === event.id)
  const declarable = equipment.filter((e) => e.type !== 'tire')
  const chosen = selected ?? []
  const declared = declarable
    .filter((e) => chosen.includes(e.id))
    .map((e) => ({
      equipmentId: e.id,
      type: e.type as 'chassis' | 'engine',
      serialNumber: e.serialNumber,
      sealNumber: e.sealNumber,
    }))
  const check = validateEquipmentDeclaration({
    declared,
    limits: rules.equipment_limits,
    engineRequiresSeal: rules.engine_requires_seal,
    equipmentUsedByOtherDrivers: usedByOthers.data,
  })
  const fee = computeLateFee(
    event.registrationDeadline,
    new Date().toISOString(),
    rules.registration.late_fee_per_day_clp,
  )

  function toggle(id: string) {
    setSelected((s) => {
      const current = s ?? []
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    })
  }

  async function submit() {
    if (!championshipEntry) return
    setBusy(true)
    setError('')
    try {
      const entry = await repos.entries.registerForEvent({
        eventId: event?.id ?? '',
        championshipEntryId: championshipEntry.id,
        equipmentIds: chosen,
        actorPersonId: session.persona.personId ?? '',
      })
      setDone(entry)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl">
        <Verdict
          tone={done.lateFee ? 'warning' : 'ok'}
          title="Inscripción enviada"
          messages={[
            `Fecha ${event.roundNumber}, ${formatDay(event.date)}. Estado: ${es.entryStatus[done.status].toLowerCase()} por secretaría.`,
            ...(done.lateFee
              ? [`Inscripción fuera de plazo: multa de ${formatClp(done.lateFeeClp)}.`]
              : []),
          ]}
        >
          <Link
            to="/piloto"
            className="inline-flex min-h-12 items-center rounded-lg bg-white px-4 font-bold text-asphalt"
          >
            Volver a mi equipo
          </Link>
        </Verdict>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title={`Inscripción Fecha ${event.roundNumber}`}
        lead={`${formatDay(event.date)} en ${event.venue}. Cierre: ${formatDateTime(event.registrationDeadline)}.`}
      />

      {existing && (
        <p className="rounded-lg border-2 border-pit bg-info-bg p-3">
          Ya estás inscrito: <strong>{es.entryStatus[existing.status].toLowerCase()}</strong>. Si
          envías de nuevo, se reemplaza tu declaración de equipo.
        </p>
      )}
      {fee.isLate && (
        <p className="rounded-lg border-2 border-caution bg-caution-bg p-3 font-bold">
          El plazo cerró. Puedes inscribirte con una multa de {formatClp(fee.feeClp)} (
          {fee.daysLate} {fee.daysLate === 1 ? 'día' : 'días'} de atraso).
        </p>
      )}

      <Panel className="flex items-center gap-4">
        <KartPlate number={championshipEntry.kartNumber} categoryId={category.id} size="lg" />
        <div>
          <p className="text-xl font-bold">{category.name}</p>
          <p className="text-asphalt-soft">Tu número se mantiene toda la temporada.</p>
        </div>
      </Panel>

      <fieldset className="space-y-2">
        <legend className="font-display text-2xl font-extrabold">Equipo para esta fecha</legend>
        <p className="text-asphalt-soft">
          Hasta {rules.equipment_limits.chassis} chasis y {rules.equipment_limits.engine} motores
          {rules.engine_requires_seal ? ', con sello vigente' : ''}.
        </p>
        {declarable.map((e) => (
          <label
            key={e.id}
            className="flex min-h-14 items-center gap-3 rounded-lg border-2 border-line bg-white px-3 has-[:checked]:border-pit"
          >
            <input
              type="checkbox"
              checked={chosen.includes(e.id)}
              onChange={() => toggle(e.id)}
              className="size-6 accent-pit"
            />
            <span className="flex-1">
              <strong>{e.type === 'chassis' ? 'Chasis' : 'Motor'}</strong> {e.brand} {e.model},
              serie {e.serialNumber}
            </span>
            {e.type === 'engine' && !e.sealNumber && (
              <StatusPill tone="caution">Sin sello</StatusPill>
            )}
          </label>
        ))}
      </fieldset>

      {chosen.length > 0 && !check.valid && (
        <ul
          className="space-y-1 rounded-lg border-2 border-stop bg-stop-bg p-3 font-bold text-stop"
          role="alert"
        >
          {check.issues.map((i) => (
            <li key={`${i.code}-${'equipmentId' in i ? i.equipmentId : ''}`}>
              {equipmentIssueMessage(i)}
            </li>
          ))}
        </ul>
      )}
      {error && <InlineError>{error}</InlineError>}

      <Button size="lg" block disabled={!check.valid || busy} onClick={submit}>
        Enviar inscripción
      </Button>
    </div>
  )
}
