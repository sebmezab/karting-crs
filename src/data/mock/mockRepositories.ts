/**
 * Implementación en memoria (+ localStorage) de los repositorios para la demo de Fase 0.
 * Replica lo que en Fase 1 harán la BD y sus funciones: toda escritura re-valida con las
 * mismas funciones puras de `domain/` y deja registro en `audit_log`.
 */
import { validateEquipmentDeclaration, type DeclaredEquipment } from '@/domain/equipment'
import {
  addStewardSelection,
  canTransition,
  createTopNSelections,
  transitionInspection,
} from '@/domain/inspection'
import { computeLateFee } from '@/domain/registration'
import {
  classifyTireEvents,
  currentCycleStartEventId,
  normalizeSerial,
  serialKey,
  TIRE_POSITIONS,
  validateTireMarking,
  type SerialOwner,
  type TireEventKind,
  type TireMarkingResult,
  type TireSerials,
} from '@/domain/tires'
import { RepositoryError } from '../errors'
import type { DataRepositories, EntrySummary, SaveTireMarkingInput } from '../repositories'
import type { EventEquipmentRole, TireSet } from '../types'
import { createLocalStorage, type MockState, type StateStorage } from './mockState'
import { buildSeed } from './seed-crs2026'

export interface MockOptions {
  storage?: StateStorage
  now?: () => Date
}

export function createMockRepositories(options: MockOptions = {}): DataRepositories {
  const seed = buildSeed()
  const storage = options.storage ?? createLocalStorage(seed.version)
  const now = options.now ?? (() => new Date())
  let state: MockState = storage.load() ?? seed
  const listeners = new Set<() => void>()
  let counter = 0

  const notify = () => listeners.forEach((l) => l())
  storage.onExternalChange(() => {
    state = storage.load() ?? buildSeed()
    notify()
  })

  const nextId = (prefix: string) => `${prefix}-${now().getTime().toString(36)}-${++counter}`
  const iso = () => now().toISOString()

  function commit(mutate: (draft: MockState) => void): void {
    const draft = structuredClone(state)
    mutate(draft)
    state = draft
    storage.save(state)
    notify()
  }

  function audit(
    draft: MockState,
    actorPersonId: string,
    action: string,
    entity: string,
    entityId: string,
    payload: Record<string, unknown> = {},
  ): void {
    // audit_log es solo inserción (SPEC 11.2): nunca se edita ni borra.
    draft.auditLog.push({
      id: nextId('al'),
      organizationId: draft.organization.id,
      actorPersonId,
      action,
      entity,
      entityId,
      payload,
      createdAt: iso(),
    })
  }

  // ---- consultas auxiliares -------------------------------------------------

  function must<T>(value: T | undefined, what: string): T {
    if (value === undefined) throw new RepositoryError('not_found', what)
    return value
  }

  const kartLabel = (championshipEntryId: string) => {
    const ce = state.championshipEntries.find((c) => c.id === championshipEntryId)
    return ce ? `kart #${ce.kartNumber}` : 'otro piloto'
  }

  const cycleEvents = () =>
    state.events.map((e) => ({
      id: e.id,
      date: e.date,
      roundNumber: e.roundNumber,
      countsForTireCycle: e.countsForTireCycle,
      tireChangeOverride: e.isTireChangeEvent,
    }))
  const cycleLength = () => state.championship.rules.tires.cycle_length_events

  function eventKind(eventId: string): TireEventKind {
    const classification = classifyTireEvents(cycleEvents(), cycleLength())
    return must(classification.get(eventId), `event ${eventId}`).kind
  }

  function serialOf(equipmentId: string): string {
    return state.equipment.find((e) => e.id === equipmentId)?.serialNumber ?? ''
  }

  /**
   * Juego vigente con el que se compara una continuación. Se ignoran:
   * - juegos de un ciclo anterior (empezaron antes de la fecha de cambio vigente: el piloto
   *   faltó a esa fecha → es un ingreso tardío), y
   * - juegos abiertos en esta misma fecha (re-marcar reemplaza la marcación anterior).
   */
  function validActiveSetFor(championshipEntryId: string, eventId: string): TireSet | undefined {
    const cycleStartId = currentCycleStartEventId(cycleEvents(), cycleLength(), eventId)
    const cycleStart = state.events.find((e) => e.id === cycleStartId)
    return state.tireSets.find((s) => {
      if (s.championshipEntryId !== championshipEntryId || s.status !== 'active') return false
      if (s.cycleStartEventId === eventId) return false
      const start = state.events.find((e) => e.id === s.cycleStartEventId)
      return !!start && (!cycleStart || start.date >= cycleStart.date)
    })
  }

  function serialOwners(): Map<string, SerialOwner> {
    const map = new Map<string, SerialOwner>()
    for (const eq of state.equipment) {
      if (eq.type !== 'tire') continue
      const ce = state.championshipEntries.find(
        (c) => c.personId === eq.ownerPersonId && c.championshipId === state.championship.id,
      )
      map.set(serialKey(eq.serialNumber), {
        personId: eq.ownerPersonId,
        label: ce ? `kart #${ce.kartNumber}` : 'otro piloto',
      })
    }
    return map
  }

  function validateMarking(input: {
    eventId: string
    eventEntryId: string
    scanned: TireSerials
    brandModelMismatch: boolean
  }): TireMarkingResult {
    const ee = must(
      state.eventEntries.find((e) => e.id === input.eventEntryId),
      'event_entry',
    )
    // La inscripción debe ser de la fecha indicada: nunca tocar juegos de otra fecha.
    if (ee.eventId !== input.eventId) throw new RepositoryError('not_found', 'event_entry')
    const ce = must(
      state.championshipEntries.find((c) => c.id === ee.championshipEntryId),
      'championship_entry',
    )
    const active = validActiveSetFor(ce.id, input.eventId)
    const startEvent = active
      ? state.events.find((e) => e.id === active.cycleStartEventId)
      : undefined
    const activeSet =
      active && startEvent
        ? {
            cycleStartRound: startEvent.roundNumber,
            serials: Object.fromEntries(
              active.items.map((i) => [i.position, serialOf(i.equipmentId)]),
            ) as TireSerials,
          }
        : null

    return validateTireMarking({
      eventKind: eventKind(input.eventId),
      driverPersonId: ce.personId,
      scanned: input.scanned,
      activeSet,
      serialOwners: serialOwners(),
      approvedReplacements: state.exceptions.filter(
        (x) =>
          x.eventEntryId === ee.id && x.type === 'puncture_replacement' && x.status === 'approved',
      ).length,
      brandModelMismatch: input.brandModelMismatch,
    })
  }

  function saveMarking(input: SaveTireMarkingInput): TireMarkingResult {
    const result = validateMarking(input)
    if (result.status === 'blocked') throw new RepositoryError('tire_marking_blocked', result)
    if (result.needsUsedTiresConfirmation && !input.usedTiresConfirmed) {
      throw new RepositoryError('used_tires_confirmation_required', result)
    }
    const ceId = state.eventEntries.find((e) => e.id === input.eventEntryId)?.championshipEntryId
    const activeSetId = ceId ? validActiveSetFor(ceId, input.eventId)?.id : undefined

    commit((draft) => {
      const ee = must(
        draft.eventEntries.find((e) => e.id === input.eventEntryId),
        'event_entry',
      )
      const ce = must(
        draft.championshipEntries.find((c) => c.id === ee.championshipEntryId),
        'championship_entry',
      )
      const category = draft.categories.find((c) => c.id === ce.categoryId)
      const at = iso()

      // Asegura un registro de equipo por serial (base de neumáticos compartida entre fechas).
      const equipmentIds = {} as Record<(typeof TIRE_POSITIONS)[number], string>
      for (const position of TIRE_POSITIONS) {
        const serial = normalizeSerial(input.scanned[position])
        let eq = draft.equipment.find(
          (e) => e.type === 'tire' && serialKey(e.serialNumber) === serialKey(serial),
        )
        if (!eq) {
          eq = {
            id: nextId('eq-ti'),
            organizationId: draft.organization.id,
            ownerPersonId: ce.personId,
            type: 'tire',
            serialNumber: serial,
            barcode: serial,
            brand: category?.tireBrand ?? 'MG',
            model: category?.tireModel ?? '',
            tireKind: 'slick',
            sealNumber: null,
          }
          draft.equipment.push(eq)
        }
        equipmentIds[position] = eq.id
      }

      // Re-marcar en la misma fecha reemplaza la marcación anterior.
      draft.eventEquipment = draft.eventEquipment.filter(
        (x) => !(x.eventEntryId === ee.id && x.role === 'tire'),
      )
      for (const position of TIRE_POSITIONS) {
        draft.eventEquipment.push({
          id: nextId('eqe'),
          eventEntryId: ee.id,
          equipmentId: equipmentIds[position],
          role: 'tire',
          tirePosition: position,
          registeredBy: input.actorPersonId,
          registeredAt: at,
          validationStatus: result.status,
          validationMessages: result.issues,
        })
      }

      const newSet = (): TireSet => ({
        id: nextId('ts'),
        championshipEntryId: ce.id,
        cycleStartEventId: input.eventId,
        tireKind: 'slick',
        status: 'active',
        items: TIRE_POSITIONS.map((position) => ({
          position,
          equipmentId: equipmentIds[position],
          replacedInEventId: null,
        })),
      })

      // Abrir juego (cambio o ingreso tardío): uno abierto en esta misma fecha se reemplaza
      // (re-marcado) y los anteriores se cierran.
      const replaceWithNewSet = () => {
        draft.tireSets = draft.tireSets.filter(
          (s) => !(s.championshipEntryId === ce.id && s.cycleStartEventId === input.eventId),
        )
        for (const s of draft.tireSets) {
          if (s.championshipEntryId === ce.id) s.status = 'closed'
        }
        draft.tireSets.push(newSet())
      }

      if (result.action === 'open_new_set') {
        replaceWithNewSet()
      } else if (result.action === 'keep_active_set' && result.status === 'overridden') {
        const active = draft.tireSets.find((s) => s.id === activeSetId)
        if (active) {
          const previous = new Set(active.items.map((i) => i.equipmentId))
          active.items = TIRE_POSITIONS.map((position) => {
            const equipmentId = equipmentIds[position]
            return {
              position,
              equipmentId,
              replacedInEventId: previous.has(equipmentId) ? null : input.eventId,
            }
          })
        }
      } else if (result.action === 'open_late_entry_set') {
        replaceWithNewSet()
        const exists = draft.exceptions.some(
          (x) => x.eventEntryId === ee.id && x.type === 'late_entry_used_tires',
        )
        if (!exists) {
          draft.exceptions.push({
            id: nextId('ex'),
            eventId: input.eventId,
            eventEntryId: ee.id,
            type: 'late_entry_used_tires',
            description: `Ingreso tardío: el revisor confirmó neumáticos usados (${kartLabel(ce.id)}).`,
            requestedBy: input.actorPersonId,
            requestedAt: at,
            status: 'pending',
            decidedBy: null,
            decidedAt: null,
            decisionNotes: null,
          })
        }
      }

      audit(draft, input.actorPersonId, 'tech.mark_tires', 'event_entry', ee.id, {
        status: result.status,
        action: result.action,
        serials: TIRE_POSITIONS.map((p) => normalizeSerial(input.scanned[p])),
      })
    })
    return result
  }

  // ---- repositorios ---------------------------------------------------------

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    resetDemo() {
      storage.clear()
      state = buildSeed()
      notify()
    },

    championships: {
      async getCurrent() {
        return {
          organization: state.organization,
          championship: state.championship,
          categories: [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder),
          events: [...state.events].sort((a, b) => a.roundNumber - b.roundNumber),
        }
      },
      async setTireChangeOverride(eventId, value, actorPersonId) {
        commit((draft) => {
          const ev = must(
            draft.events.find((e) => e.id === eventId),
            'event',
          )
          const before = ev.isTireChangeEvent
          ev.isTireChangeEvent = value
          audit(draft, actorPersonId, 'event.set_tire_change_override', 'event', eventId, {
            before,
            after: value,
          })
        })
      },
    },

    people: {
      async getPerson(personId) {
        return state.people.find((p) => p.id === personId) ?? null
      },
      async getDriverProfile(personId) {
        return state.driverProfiles.find((d) => d.personId === personId) ?? null
      },
    },

    entries: {
      async listForEvent(eventId) {
        const out: EntrySummary[] = []
        for (const ce of state.championshipEntries) {
          if (ce.status !== 'active') continue
          const person = must(
            state.people.find((p) => p.id === ce.personId),
            'person',
          )
          const category = must(
            state.categories.find((c) => c.id === ce.categoryId),
            'category',
          )
          out.push({
            championshipEntry: ce,
            person: { id: person.id, fullName: person.fullName, birthYear: person.birthYear },
            category,
            eventEntry:
              state.eventEntries.find(
                (e) => e.eventId === eventId && e.championshipEntryId === ce.id,
              ) ?? null,
          })
        }
        return out.sort((a, b) => a.championshipEntry.kartNumber - b.championshipEntry.kartNumber)
      },
      async listChampionshipEntriesForPerson(personId) {
        return state.championshipEntries.filter((c) => c.personId === personId)
      },
      async listEventEntriesForPerson(personId) {
        const ceIds = new Set(
          state.championshipEntries.filter((c) => c.personId === personId).map((c) => c.id),
        )
        return state.eventEntries.filter((e) => ceIds.has(e.championshipEntryId))
      },
      async registerForEvent(input) {
        const event = must(
          state.events.find((e) => e.id === input.eventId),
          'event',
        )
        const ce = must(
          state.championshipEntries.find((c) => c.id === input.championshipEntryId),
          'championship_entry',
        )
        const declared: DeclaredEquipment[] = input.equipmentIds.map((id) => {
          const eq = must(
            state.equipment.find((e) => e.id === id && e.ownerPersonId === ce.personId),
            'equipment',
          )
          if (eq.type === 'tire') throw new RepositoryError('equipment_invalid')
          return {
            equipmentId: eq.id,
            type: eq.type,
            serialNumber: eq.serialNumber,
            sealNumber: eq.sealNumber,
          }
        })
        const rules = state.championship.rules
        const check = validateEquipmentDeclaration({
          declared,
          limits: rules.equipment_limits,
          engineRequiresSeal: rules.engine_requires_seal,
          equipmentUsedByOtherDrivers: usedByOthers(input.eventId, ce.id),
        })
        if (!check.valid) throw new RepositoryError('equipment_invalid', check.issues)

        const at = iso()
        const fee = computeLateFee(
          event.registrationDeadline,
          at,
          rules.registration.late_fee_per_day_clp,
        )
        // Modificar la inscripción conserva el mismo registro (su marcación de neumáticos,
        // selecciones a revisión y excepciones apuntan a él), la hora original y la multa
        // original: corregir el equipo después del cierre no genera multa nueva.
        const previous = state.eventEntries.find(
          (e) => e.eventId === input.eventId && e.championshipEntryId === ce.id,
        )
        const entryId = previous?.id ?? nextId('ee')
        commit((draft) => {
          draft.eventEntries = draft.eventEntries.filter((e) => e.id !== entryId)
          draft.eventEquipment = draft.eventEquipment.filter(
            (x) => x.eventEntryId !== entryId || x.role === 'tire',
          )
          draft.eventEntries.push({
            id: entryId,
            eventId: input.eventId,
            championshipEntryId: ce.id,
            status: 'pending',
            lateFee: previous ? previous.lateFee : fee.isLate,
            lateFeeClp: previous ? previous.lateFeeClp : fee.feeClp,
            paid: previous?.paid ?? false,
            registeredAt: previous?.registeredAt ?? at,
          })
          let chassis = 0
          let engines = 0
          for (const d of declared) {
            const role: EventEquipmentRole =
              d.type === 'chassis'
                ? ++chassis === 1
                  ? 'chassis_1'
                  : 'chassis_2'
                : ++engines === 1
                  ? 'engine_1'
                  : 'engine_2'
            draft.eventEquipment.push({
              id: nextId('eqe'),
              eventEntryId: entryId,
              equipmentId: d.equipmentId,
              role,
              tirePosition: null,
              registeredBy: input.actorPersonId,
              registeredAt: at,
              validationStatus: 'ok',
              validationMessages: [],
            })
          }
          audit(draft, input.actorPersonId, 'entries.register', 'event_entry', entryId, {
            eventId: input.eventId,
            equipment: input.equipmentIds,
            lateFee: fee.isLate,
          })
        })
        return must(
          state.eventEntries.find((e) => e.id === entryId),
          'event_entry',
        )
      },
    },

    equipment: {
      async listByOwner(personId) {
        return state.equipment.filter((e) => e.ownerPersonId === personId)
      },
      async usedByOtherDrivers(eventId, championshipEntryId) {
        return usedByOthers(eventId, championshipEntryId)
      },
      async listEventEquipment(eventEntryId) {
        return state.eventEquipment.filter((x) => x.eventEntryId === eventEntryId)
      },
    },

    tires: {
      async validate(input) {
        return validateMarking(input)
      },
      async save(input) {
        return saveMarking(input)
      },
      async listSetsForEntry(championshipEntryId) {
        return state.tireSets.filter((s) => s.championshipEntryId === championshipEntryId)
      },
      async serialsById(ids) {
        return new Map(ids.map((id) => [id, serialOf(id)]))
      },
    },

    sessions: {
      async listForEvent(eventId) {
        return state.sessions
          .filter((s) => s.eventId === eventId)
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      },
      async listResults(sessionId) {
        return state.sessionResults
          .filter((r) => r.sessionId === sessionId)
          .sort((a, b) => a.position - b.position)
      },
      async closeWithTopN(sessionId, orderedEventEntryIds, actorPersonId) {
        const at = iso()
        const selections = createTopNSelections({
          sessionId,
          orderedEventEntryIds,
          n: state.championship.rules.post_session_inspection.default_top_n,
          selectedBy: actorPersonId,
          at,
        })
        commit((draft) => {
          const session = must(
            draft.sessions.find((s) => s.id === sessionId),
            'session',
          )
          session.status = 'finished'
          draft.sessionResults = draft.sessionResults.filter((r) => r.sessionId !== sessionId)
          orderedEventEntryIds.forEach((eventEntryId, idx) => {
            draft.sessionResults.push({
              id: nextId('sr'),
              sessionId,
              eventEntryId,
              position: idx + 1,
              status: 'classified',
              isProvisional: true,
              source: 'manual',
            })
          })
          for (const sel of selections) {
            const already = draft.inspections.some(
              (i) => i.sessionId === sessionId && i.eventEntryId === sel.eventEntryId,
            )
            if (!already) draft.inspections.push({ ...sel, id: nextId('is') })
          }
          audit(draft, actorPersonId, 'sessions.close_with_top_n', 'session', sessionId, {
            topN: orderedEventEntryIds,
          })
        })
      },
    },

    inspections: {
      async listForEvent(eventId) {
        const sessionIds = new Set(
          state.sessions.filter((s) => s.eventId === eventId).map((s) => s.id),
        )
        return state.inspections.filter((i) => sessionIds.has(i.sessionId))
      },
      async addStewardSelection(sessionId, eventEntryId, actorPersonId) {
        const result = addStewardSelection(state.inspections, {
          sessionId,
          eventEntryId,
          selectedBy: actorPersonId,
          at: iso(),
        })
        if (!result.ok) throw new RepositoryError('already_selected')
        commit((draft) => {
          const id = nextId('is')
          draft.inspections.push({ ...result.selection, id })
          audit(draft, actorPersonId, 'inspection.select', 'inspection_selection', id, {
            sessionId,
            eventEntryId,
          })
        })
      },
      async transition(selectionId, to, actorPersonId, notes) {
        const current = must(
          state.inspections.find((i) => i.id === selectionId),
          'inspection',
        )
        if (!canTransition(current.status, to)) throw new RepositoryError('invalid_transition')
        const next = transitionInspection(current, to, { by: actorPersonId, at: iso(), notes })
        commit((draft) => {
          draft.inspections = draft.inspections.map((i) =>
            i.id === selectionId ? { ...next, id: selectionId } : i,
          )
          audit(
            draft,
            actorPersonId,
            'inspection.transition',
            'inspection_selection',
            selectionId,
            {
              from: current.status,
              to,
            },
          )
        })
      },
    },

    exceptions: {
      async listForEvent(eventId) {
        return state.exceptions.filter((x) => x.eventId === eventId)
      },
      async request(input) {
        const id = nextId('ex')
        commit((draft) => {
          draft.exceptions.push({
            id,
            eventId: input.eventId,
            eventEntryId: input.eventEntryId,
            type: input.type,
            description: input.description,
            requestedBy: input.actorPersonId,
            requestedAt: iso(),
            status: 'pending',
            decidedBy: null,
            decidedAt: null,
            decisionNotes: null,
          })
          audit(draft, input.actorPersonId, 'exceptions.request', 'exception_request', id, {
            type: input.type,
          })
        })
        return must(
          state.exceptions.find((x) => x.id === id),
          'exception',
        )
      },
      async decide(id, approved, notes, actorPersonId) {
        commit((draft) => {
          const x = must(
            draft.exceptions.find((e) => e.id === id),
            'exception',
          )
          // Una decisión no se edita: se corrige con una solicitud nueva (SPEC 11.2).
          if (x.status !== 'pending') throw new RepositoryError('already_decided')
          x.status = approved ? 'approved' : 'rejected'
          x.decidedBy = actorPersonId
          x.decidedAt = iso()
          x.decisionNotes = notes
          audit(draft, actorPersonId, 'exceptions.decide', 'exception_request', id, { approved })
        })
      },
    },

    staff: {
      async listRoles() {
        return state.roles
      },
      async listForEvent(eventId) {
        return state.eventStaff.filter((s) => s.eventId === eventId)
      },
    },

    standings: {
      async list(championshipId) {
        return championshipId === state.championship.id ? state.standings : []
      },
    },

    audit: {
      async listRecent(limit) {
        return [...state.auditLog].reverse().slice(0, limit)
      },
    },
  }

  function usedByOthers(eventId: string, championshipEntryId: string): Map<string, string> {
    const map = new Map<string, string>()
    for (const ee of state.eventEntries) {
      if (ee.eventId !== eventId || ee.championshipEntryId === championshipEntryId) continue
      for (const x of state.eventEquipment) {
        if (x.eventEntryId === ee.id && x.role !== 'tire') {
          map.set(x.equipmentId, kartLabel(ee.championshipEntryId))
        }
      }
    }
    return map
  }
}
