import { describe, expect, it } from 'vitest'
import { DEMO_IDS, TIRE_DEMO_CASES, type TireDemoCase } from '../demo'
import { RepositoryError } from '../errors'
import type { DataRepositories } from '../repositories'
import { createMockRepositories } from './mockRepositories'
import { createMemoryStorage, type MockState } from './mockState'
import { buildSeed } from './seed-crs2026'

const F6 = DEMO_IDS.currentEvent
const NOW = new Date('2026-11-15T12:00:00Z')

function repos(now = NOW): DataRepositories {
  return createMockRepositories({ storage: createMemoryStorage(), now: () => now })
}

const serials = (kart: number, prefix: string) => ({
  FL: `MG-${kart}-${prefix}1`,
  FR: `MG-${kart}-${prefix}2`,
  RL: `MG-${kart}-${prefix}3`,
  RR: `MG-${kart}-${prefix}4`,
})

function demoCase(key: TireDemoCase['key']): TireDemoCase {
  const found = TIRE_DEMO_CASES.find((c) => c.key === key)
  if (!found) throw new Error(key)
  return found
}

async function eventEntryId(r: DataRepositories, kart: number): Promise<string> {
  const entries = await r.entries.listForEvent(F6)
  const entry = entries.find((e) => e.championshipEntry.kartNumber === kart)?.eventEntry
  if (!entry) throw new Error(`kart ${kart} no inscrito en F6`)
  return entry.id
}

describe('seed CRS 2026 (SPEC §9)', () => {
  it('tiene ~25 pilotos ficticios en 4 categorías y las 8 categorías del campeonato', async () => {
    const r = repos()
    const overview = await r.championships.getCurrent()
    expect(overview.categories).toHaveLength(8)
    expect(overview.events.map((e) => e.date)).toEqual([
      '2026-02-21',
      '2026-03-21',
      '2026-05-23',
      '2026-08-22',
      '2026-10-10',
      '2026-11-21',
    ])
    const entries = await r.entries.listForEvent(F6)
    expect(entries).toHaveLength(25)
    expect(new Set(entries.map((e) => e.category.id)).size).toBe(4)
  })

  it('todos los números de kart están dentro del rango de su categoría y no se repiten', async () => {
    const entries = await repos().entries.listForEvent(F6)
    for (const e of entries) {
      expect(e.championshipEntry.kartNumber).toBeGreaterThanOrEqual(e.category.numberMin)
      expect(e.championshipEntry.kartNumber).toBeLessThanOrEqual(e.category.numberMax)
    }
    const numbers = entries.map((e) => e.championshipEntry.kartNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('las personas de la demo no tienen datos prohibidos por la minimización (SPEC 11.1)', async () => {
    const person = await repos().people.getPerson(DEMO_IDS.driverPerson)
    expect(Object.keys(person ?? {}).sort()).toEqual(
      ['birthYear', 'email', 'fullName', 'guardianPersonId', 'id', 'phone'].sort(),
    )
    expect(person?.email).toMatch(/@example\.com$/)
  })
})

describe('casos de demo de marcación en F6', () => {
  it('caso OK: mismo juego del ciclo F4 → verde', async () => {
    const r = repos()
    const c = demoCase('ok')
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, c.kartNumber),
      scanned: c.serials,
      brandModelMismatch: false,
    })
    expect(result.status).toBe('ok')
    expect(result.issues[0]).toMatchObject({ code: 'same_set_ok', params: { round: 4 } })
  })

  it('caso bloqueado: RR distinto en continuación → rojo con la Fecha 4', async () => {
    const r = repos()
    const c = demoCase('mismatch')
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, c.kartNumber),
      scanned: c.serials,
      brandModelMismatch: false,
    })
    expect(result.status).toBe('blocked')
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'serial_mismatch_continuation',
        position: 'RR',
        params: { round: 4, serial: 'MG-327-C4' },
      }),
    ])
  })

  it('caso intercambio: neumático del kart #355 → rojo', async () => {
    const r = repos()
    const c = demoCase('exchange')
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, c.kartNumber),
      scanned: c.serials,
      brandModelMismatch: false,
    })
    expect(result.status).toBe('blocked')
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'serial_owned_by_other_driver',
        position: 'FR',
        params: { serial: 'MG-355-A2', owner: 'kart #355' },
      }),
    ])
  })

  it('caso ingreso tardío: ámbar; al guardar con confirmación crea juego y excepción pendiente', async () => {
    const r = repos()
    const c = demoCase('late_entry')
    const eeId = await eventEntryId(r, c.kartNumber)
    const input = { eventId: F6, eventEntryId: eeId, scanned: c.serials, brandModelMismatch: false }
    expect((await r.tires.validate(input)).status).toBe('warning')

    await expect(
      r.tires.save({ ...input, usedTiresConfirmed: false, actorPersonId: DEMO_IDS.techInspector }),
    ).rejects.toMatchObject({ code: 'used_tires_confirmation_required' })

    await r.tires.save({
      ...input,
      usedTiresConfirmed: true,
      actorPersonId: DEMO_IDS.techInspector,
    })
    const exceptions = await r.exceptions.listForEvent(F6)
    expect(exceptions).toEqual([
      expect.objectContaining({
        type: 'late_entry_used_tires',
        status: 'pending',
        eventEntryId: eeId,
      }),
    ])
    // El juego quedó registrado para el ciclo.
    const sets = await r.tires.listSetsForEntry('ce-366')
    expect(sets.filter((s) => s.status === 'active')).toHaveLength(1)
    // T-J2: re-marcar en la MISMA fecha reemplaza la marcación, así que se re-valida como
    // ingreso tardío (no contra el juego recién creado).
    expect((await r.tires.validate(input)).action).toBe('open_late_entry_set')
  })

  it('no se puede guardar una marcación bloqueada', async () => {
    const r = repos()
    const c = demoCase('mismatch')
    await expect(
      r.tires.save({
        eventId: F6,
        eventEntryId: await eventEntryId(r, c.kartNumber),
        scanned: c.serials,
        brandModelMismatch: false,
        usedTiresConfirmed: false,
        actorPersonId: DEMO_IDS.techInspector,
      }),
    ).rejects.toBeInstanceOf(RepositoryError)
  })

  it('bloqueado + excepción de pinchazo aprobada por el comisario → se guarda como excepción aplicada', async () => {
    const r = repos()
    const c = demoCase('mismatch')
    const eeId = await eventEntryId(r, c.kartNumber)
    const ex = await r.exceptions.request({
      eventId: F6,
      eventEntryId: eeId,
      type: 'puncture_replacement',
      description: 'Pinchazo RR',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await r.exceptions.decide(ex.id, true, 'Desgaste similar verificado', DEMO_IDS.steward)
    const result = await r.tires.save({
      eventId: F6,
      eventEntryId: eeId,
      scanned: c.serials,
      brandModelMismatch: false,
      usedTiresConfirmed: false,
      actorPersonId: DEMO_IDS.techInspector,
    })
    expect(result.status).toBe('overridden')
    const sets = await r.tires.listSetsForEntry('ce-327')
    const active = sets.find((s) => s.status === 'active')
    expect(active?.items.find((i) => i.position === 'RR')?.replacedInEventId).toBe(F6)
  })

  it('con el override de F6 quitado, F6 vuelve a ser fecha de cambio y el caso "bloqueado" pasa a verde', async () => {
    const r = repos()
    await r.championships.setTireChangeOverride(F6, null, DEMO_IDS.admin)
    const c = demoCase('mismatch')
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, c.kartNumber),
      scanned: c.serials,
      brandModelMismatch: false,
    })
    expect(result).toMatchObject({ status: 'ok', action: 'open_new_set' })
  })
})

describe('inscripción a F6 de la piloto de demo', () => {
  it('R-9: inscripción válida queda pendiente y se audita', async () => {
    const r = repos()
    const entry = await r.entries.registerForEvent({
      eventId: F6,
      championshipEntryId: 'ce-318',
      equipmentIds: ['eq-ch-318-1', 'eq-en-318-1', 'eq-en-318-2'],
      actorPersonId: DEMO_IDS.driverPerson,
    })
    expect(entry).toMatchObject({ status: 'pending', lateFee: false, lateFeeClp: 0 })
    expect((await r.audit.listRecent(1))[0]).toMatchObject({ action: 'entries.register' })
  })

  it('después del cierre se registra la multa', async () => {
    const r = repos(new Date('2026-11-20T12:00:00Z'))
    const entry = await r.entries.registerForEvent({
      eventId: F6,
      championshipEntryId: 'ce-318',
      equipmentIds: ['eq-ch-318-1', 'eq-en-318-1'],
      actorPersonId: DEMO_IDS.driverPerson,
    })
    expect(entry).toMatchObject({ lateFee: true, lateFeeClp: 30000 })
  })

  it('el 3er motor (sin sello y sobre el límite) se rechaza', async () => {
    const r = repos()
    await expect(
      r.entries.registerForEvent({
        eventId: F6,
        championshipEntryId: 'ce-318',
        equipmentIds: ['eq-ch-318-1', 'eq-en-318-1', 'eq-en-318-2', 'eq-en-318-3'],
        actorPersonId: DEMO_IDS.driverPerson,
      }),
    ).rejects.toMatchObject({ code: 'equipment_invalid' })
  })
})

describe('revisión post-sesión', () => {
  it('cerrar con Top 3, agregar a criterio y resolver; notifica a los suscriptores', async () => {
    const r = repos()
    let notifications = 0
    r.subscribe(() => notifications++)
    const session = 'se-f6-cat-dd2-senior-qualifying'
    const top = await Promise.all([312, 327, 341].map((k) => eventEntryId(r, k)))
    await r.sessions.closeWithTopN(session, top, DEMO_IDS.timekeeper)

    let list = await r.inspections.listForEvent(F6)
    expect(list.map((i) => [i.eventEntryId, i.reason, i.status])).toEqual(
      top.map((id) => [id, 'top_n', 'pending']),
    )

    const extra = await eventEntryId(r, 372)
    await r.inspections.addStewardSelection(session, extra, DEMO_IDS.technicalDirector)
    await expect(
      r.inspections.addStewardSelection(session, extra, DEMO_IDS.technicalDirector),
    ).rejects.toMatchObject({ code: 'already_selected' })

    list = await r.inspections.listForEvent(F6)
    const first = list[0]
    if (!first) throw new Error('sin selección')
    await r.inspections.transition(first.id, 'in_progress', DEMO_IDS.techInspector)
    await r.inspections.transition(
      first.id,
      'observed',
      DEMO_IDS.techInspector,
      'Peso bajo el mínimo',
    )
    await expect(
      r.inspections.transition(first.id, 'ok', DEMO_IDS.techInspector),
    ).rejects.toMatchObject({
      code: 'invalid_transition',
    })

    list = await r.inspections.listForEvent(F6)
    expect(list).toHaveLength(4)
    expect(list[0]).toMatchObject({ status: 'observed', notes: 'Peso bajo el mínimo' })
    expect((await r.sessions.listForEvent(F6)).find((s) => s.id === session)?.status).toBe(
      'finished',
    )
    expect(notifications).toBeGreaterThanOrEqual(4)
  })

  it('reiniciar la demo vuelve a los datos de ejemplo', async () => {
    const r = repos()
    await r.championships.setTireChangeOverride(F6, true, DEMO_IDS.admin)
    r.resetDemo?.()
    const overview = await r.championships.getCurrent()
    expect(overview.events.find((e) => e.id === F6)?.isTireChangeEvent).toBe(false)
  })
})

describe('guardado de la marcación de neumáticos — re-marcado y excepciones (QA)', () => {
  const save = (
    r: DataRepositories,
    eventEntry: string,
    scanned: ReturnType<typeof serials>,
    usedTiresConfirmed = false,
  ) =>
    r.tires.save({
      eventId: F6,
      eventEntryId: eventEntry,
      scanned,
      brandModelMismatch: false,
      usedTiresConfirmed,
      actorPersonId: DEMO_IDS.techInspector,
    })

  it('T-V1: re-marcar el mismo kart dos veces en una fecha de cambio deja un solo juego activo (el último)', async () => {
    const r = repos()
    await r.championships.setTireChangeOverride(F6, true, DEMO_IDS.admin)
    const ee = await eventEntryId(r, 312)

    await save(r, ee, serials(312, 'N'))
    await save(r, ee, serials(312, 'M'))

    const sets = await r.tires.listSetsForEntry('ce-312')
    const active = sets.filter((s) => s.status === 'active')
    expect(active).toHaveLength(1)
    expect(active[0]?.cycleStartEventId).toBe(F6)
    const ids = active[0]?.items.map((i) => i.equipmentId) ?? []
    expect([...(await r.tires.serialsById(ids)).values()]).toEqual(Object.values(serials(312, 'M')))
    // Los juegos de ciclos anteriores quedan cerrados, no se borran.
    expect(sets.filter((s) => s.status === 'closed').map((s) => s.id)).toEqual(
      expect.arrayContaining(['ts-312-A', 'ts-312-B']),
    )
    // La marcación de la fecha se reemplaza: 4 neumáticos, no 8.
    const tires = (await r.equipment.listEventEquipment(ee)).filter((x) => x.role === 'tire')
    expect(tires).toHaveLength(4)
  })

  it('T-V6: lo marcado en una fecha de cambio queda a nombre del piloto y bloquea su uso por otro kart', async () => {
    const r = repos()
    await r.championships.setTireChangeOverride(F6, true, DEMO_IDS.admin)
    await save(r, await eventEntryId(r, 312), serials(312, 'N'))
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 327),
      scanned: { ...serials(327, 'N'), FR: 'MG-312-N2' },
      brandModelMismatch: false,
    })
    expect(result.status).toBe('blocked')
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'serial_owned_by_other_driver', position: 'FR' }),
    ])
  })

  it('T-V2: re-marcar dos veces el mismo juego en continuación no duplica juegos ni marcación', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 312)
    await save(r, ee, serials(312, 'A'))
    await save(r, ee, { FL: 'MG-312-A2', FR: 'MG-312-A1', RL: 'MG-312-A3', RR: 'MG-312-A4' })
    const sets = await r.tires.listSetsForEntry('ce-312')
    expect(sets.filter((s) => s.status === 'active').map((s) => s.id)).toEqual(['ts-312-A'])
    const tires = (await r.equipment.listEventEquipment(ee)).filter((x) => x.role === 'tire')
    expect(tires).toHaveLength(4)
  })

  it('T-V5: guardar dos veces el ingreso tardío con los mismos seriales no duplica la excepción ni el juego', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 366)
    await save(r, ee, serials(366, 'U'), true)
    await save(r, ee, serials(366, 'U'), true)
    const exceptions = (await r.exceptions.listForEvent(F6)).filter(
      (x) => x.type === 'late_entry_used_tires',
    )
    expect(exceptions).toHaveLength(1)
    const sets = await r.tires.listSetsForEntry('ce-366')
    expect(sets.filter((s) => s.status === 'active')).toHaveLength(1)
  })

  it('T-V4: una excepción de pinchazo PENDIENTE no habilita guardar', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 327)
    await r.exceptions.request({
      eventId: F6,
      eventEntryId: ee,
      type: 'puncture_replacement',
      description: 'Pinchazo RR',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await expect(save(r, ee, demoCase('mismatch').serials)).rejects.toMatchObject({
      code: 'tire_marking_blocked',
    })
  })

  it('T-V4: una excepción de pinchazo RECHAZADA no habilita guardar', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 327)
    const ex = await r.exceptions.request({
      eventId: F6,
      eventEntryId: ee,
      type: 'puncture_replacement',
      description: 'Pinchazo RR',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await r.exceptions.decide(ex.id, false, 'Desgaste no similar', DEMO_IDS.steward)
    await expect(save(r, ee, demoCase('mismatch').serials)).rejects.toMatchObject({
      code: 'tire_marking_blocked',
    })
  })

  it('T-V4: la excepción aprobada de OTRO kart no se aplica a este', async () => {
    const r = repos()
    const ex = await r.exceptions.request({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 312),
      type: 'puncture_replacement',
      description: 'Pinchazo',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await r.exceptions.decide(ex.id, true, 'OK', DEMO_IDS.steward)
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 327),
      scanned: demoCase('mismatch').serials,
      brandModelMismatch: false,
    })
    expect(result.status).toBe('blocked')
  })

  it('T-V4: tras guardar con excepción aprobada, el juego activo incluye el reemplazo y re-validar da verde', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 327)
    const ex = await r.exceptions.request({
      eventId: F6,
      eventEntryId: ee,
      type: 'puncture_replacement',
      description: 'Pinchazo RR',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await r.exceptions.decide(ex.id, true, 'OK', DEMO_IDS.steward)
    await save(r, ee, demoCase('mismatch').serials)

    const sets = await r.tires.listSetsForEntry('ce-327')
    expect(sets.filter((s) => s.status === 'active').map((s) => s.id)).toEqual(['ts-327-A'])
    // El juego del ciclo anterior no se toca.
    expect(
      sets.find((s) => s.id === 'ts-327-B')?.items.every((i) => i.replacedInEventId === null),
    ).toBe(true)
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: ee,
      scanned: demoCase('mismatch').serials,
      brandModelMismatch: false,
    })
    expect(result).toMatchObject({ status: 'ok', action: 'keep_active_set' })
  })

  it('T-V10: el guardado normaliza el texto escaneado y el serial queda a nombre del piloto para detectar intercambios', async () => {
    const r = repos()
    await save(
      r,
      await eventEntryId(r, 366),
      { FL: ' mg-366-u1\n', FR: 'MG-366-U2', RL: 'mg 366-u3', RR: 'MG-366-U4' },
      true,
    )
    const sets = await r.tires.listSetsForEntry('ce-366')
    const ids = sets[0]?.items.map((i) => i.equipmentId) ?? []
    expect([...(await r.tires.serialsById(ids)).values()]).toEqual([
      'MG-366-U1',
      'MG-366-U2',
      'MG366-U3',
      'MG-366-U4',
    ])
    expect((await r.audit.listRecent(1))[0]).toMatchObject({
      action: 'tech.mark_tires',
      payload: { serials: ['MG-366-U1', 'MG-366-U2', 'MG366-U3', 'MG-366-U4'] },
    })

    await r.championships.setTireChangeOverride(F6, true, DEMO_IDS.admin)
    const other = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 312),
      scanned: { ...serials(312, 'N'), RR: 'mg-366-u1' },
      brandModelMismatch: false,
    })
    expect(other.issues).toEqual([
      expect.objectContaining({
        code: 'serial_owned_by_other_driver',
        params: { serial: 'MG-366-U1', owner: 'kart #366' },
      }),
    ])
  })
})

describe('revisión post-sesión — bordes del repositorio (QA)', () => {
  const SESSION = 'se-f6-cat-dd2-senior-qualifying'

  it('I-2: cerrar con un kart repetido en el Top N se rechaza y no cambia nada', async () => {
    const r = repos()
    const a = await eventEntryId(r, 312)
    await expect(
      r.sessions.closeWithTopN(SESSION, [a, a, await eventEntryId(r, 327)], DEMO_IDS.timekeeper),
    ).rejects.toThrow()
    expect(await r.inspections.listForEvent(F6)).toEqual([])
    expect((await r.sessions.listForEvent(F6)).find((s) => s.id === SESSION)?.status).toBe(
      'running',
    )
  })

  it('I-1/I-4: volver a cerrar la misma sesión no duplica las selecciones existentes', async () => {
    const r = repos()
    const top = await Promise.all([312, 327, 341].map((k) => eventEntryId(r, k)))
    await r.sessions.closeWithTopN(SESSION, top, DEMO_IDS.timekeeper)
    await r.sessions.closeWithTopN(SESSION, top, DEMO_IDS.timekeeper)
    expect(await r.inspections.listForEvent(F6)).toHaveLength(3)
    expect(await r.sessions.listResults(SESSION)).toHaveLength(3)
  })

  it('I-1/I-4: un kart agregado a criterio que luego entra al Top N no se duplica', async () => {
    const r = repos()
    const kart312 = await eventEntryId(r, 312)
    await r.inspections.addStewardSelection(SESSION, kart312, DEMO_IDS.steward)
    const top = [kart312, await eventEntryId(r, 327), await eventEntryId(r, 341)]
    await r.sessions.closeWithTopN(SESSION, top, DEMO_IDS.timekeeper)
    const list = await r.inspections.listForEvent(F6)
    expect(list.filter((i) => i.eventEntryId === kart312)).toHaveLength(1)
    expect(list).toHaveLength(3)
  })

  it('I-3: la selección a criterio guarda quién y cuándo, y queda en auditoría', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 372)
    await r.inspections.addStewardSelection(SESSION, ee, DEMO_IDS.steward)
    const [sel] = await r.inspections.listForEvent(F6)
    expect(sel).toMatchObject({
      reason: 'steward_selection',
      selectedBy: DEMO_IDS.steward,
      selectedAt: NOW.toISOString(),
      status: 'pending',
    })
    expect((await r.audit.listRecent(1))[0]).toMatchObject({
      action: 'inspection.select',
      actorPersonId: DEMO_IDS.steward,
    })
  })

  it('I-5: pending → ok directo registra la hora de cierre y el inspector', async () => {
    const r = repos()
    await r.inspections.addStewardSelection(SESSION, await eventEntryId(r, 372), DEMO_IDS.steward)
    const [sel] = await r.inspections.listForEvent(F6)
    if (!sel) throw new Error('sin selección')
    await r.inspections.transition(sel.id, 'ok', DEMO_IDS.techInspector)
    const [after] = await r.inspections.listForEvent(F6)
    expect(after).toMatchObject({
      status: 'ok',
      closedAt: NOW.toISOString(),
      inspectorPersonId: DEMO_IDS.techInspector,
    })
  })
})

function reposFrom(mutate: (state: MockState) => void): DataRepositories {
  const storage = createMemoryStorage()
  const seed = buildSeed()
  mutate(seed)
  storage.save(seed)
  return createMockRepositories({ storage, now: () => NOW })
}

describe('juego vigente, re-marcado e integridad (correcciones de QA)', () => {
  it('T-J1: si el único juego activo es de un ciclo anterior (faltó a la fecha de cambio) → ingreso tardío', async () => {
    const r = reposFrom((s) => {
      s.tireSets = s.tireSets.filter((t) => t.id !== 'ts-312-A')
      const b = s.tireSets.find((t) => t.id === 'ts-312-B')
      if (b) b.status = 'active'
    })
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 312),
      scanned: serials(312, 'B'),
      brandModelMismatch: false,
    })
    expect(result).toMatchObject({ status: 'warning', action: 'open_late_entry_set' })
  })

  it('T-J2: el ingreso tardío se puede corregir en la misma fecha y queda un solo juego activo', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 366)
    const base = { eventId: F6, eventEntryId: ee, brandModelMismatch: false }
    await r.tires.save({
      ...base,
      scanned: serials(366, 'U'),
      usedTiresConfirmed: true,
      actorPersonId: DEMO_IDS.techInspector,
    })
    const corrected = { ...serials(366, 'U'), RR: 'MG-366-U9' }
    const result = await r.tires.validate({ ...base, scanned: corrected })
    expect(result).toMatchObject({ status: 'warning', action: 'open_late_entry_set' })
    await r.tires.save({
      ...base,
      scanned: corrected,
      usedTiresConfirmed: true,
      actorPersonId: DEMO_IDS.techInspector,
    })
    const sets = await r.tires.listSetsForEntry('ce-366')
    expect(sets.filter((s) => s.status === 'active')).toHaveLength(1)
    expect((await r.exceptions.listForEvent(F6)).filter((x) => x.eventEntryId === ee)).toHaveLength(
      1,
    )
  })

  it('T-J3: validar con una inscripción que no es de la fecha indicada es un error', async () => {
    const r = repos()
    await expect(
      r.tires.validate({
        eventId: 'ev-2026-f4',
        eventEntryId: await eventEntryId(r, 327),
        scanned: demoCase('mismatch').serials,
        brandModelMismatch: false,
      }),
    ).rejects.toBeInstanceOf(RepositoryError)
  })

  it('T-J4: una excepción ya decidida no se puede volver a decidir', async () => {
    const r = repos()
    const ex = await r.exceptions.request({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 327),
      type: 'puncture_replacement',
      description: 'Pinchazo RR',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await r.exceptions.decide(ex.id, true, 'OK', DEMO_IDS.steward)
    await expect(
      r.exceptions.decide(ex.id, false, 'Cambio de opinión', DEMO_IDS.steward),
    ).rejects.toMatchObject({ code: 'already_decided' })
  })

  it('T-V4: una excepción de pinchazo aprobada no habilita cambiar los 4 neumáticos', async () => {
    const r = repos()
    const ee = await eventEntryId(r, 327)
    const ex = await r.exceptions.request({
      eventId: F6,
      eventEntryId: ee,
      type: 'puncture_replacement',
      description: 'Pinchazo RR',
      actorPersonId: DEMO_IDS.techInspector,
    })
    await r.exceptions.decide(ex.id, true, 'OK', DEMO_IDS.steward)
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: ee,
      scanned: serials(327, 'Z'),
      brandModelMismatch: false,
    })
    expect(result.status).toBe('blocked')
  })

  it('T-V10b: tipear el serial de otro piloto sin guiones sigue bloqueado por intercambio', async () => {
    const r = repos()
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 341),
      scanned: { FL: 'MG-341-A1', FR: 'MG355A2', RL: 'MG-341-A3', RR: 'MG-341-A4' },
      brandModelMismatch: false,
    })
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'serial_owned_by_other_driver', position: 'FR' }),
    )
  })

  it('T-V10b: el mismo juego tipeado sin guiones es el mismo juego', async () => {
    const r = repos()
    const result = await r.tires.validate({
      eventId: F6,
      eventEntryId: await eventEntryId(r, 312),
      scanned: { FL: 'MG312A1', FR: 'mg 312 a2', RL: 'MG-312-A3', RR: 'MG-312A4' },
      brandModelMismatch: false,
    })
    expect(result.status).toBe('ok')
  })

  it('re-inscribirse conserva la misma inscripción: no deja huérfanas las selecciones a revisión', async () => {
    const r = repos()
    const first = await r.entries.registerForEvent({
      eventId: F6,
      championshipEntryId: 'ce-318',
      equipmentIds: ['eq-ch-318-1', 'eq-en-318-1'],
      actorPersonId: DEMO_IDS.driverPerson,
    })
    await r.inspections.addStewardSelection(
      'se-f6-cat-dd2-senior-qualifying',
      first.id,
      DEMO_IDS.technicalDirector,
    )
    const second = await r.entries.registerForEvent({
      eventId: F6,
      championshipEntryId: 'ce-318',
      equipmentIds: ['eq-ch-318-2', 'eq-en-318-2'],
      actorPersonId: DEMO_IDS.driverPerson,
    })
    expect(second.id).toBe(first.id)
    const equipment = await r.equipment.listEventEquipment(first.id)
    expect(equipment.map((e) => e.equipmentId).sort()).toEqual(['eq-ch-318-2', 'eq-en-318-2'])
    expect((await r.inspections.listForEvent(F6)).map((i) => i.eventEntryId)).toContain(first.id)
  })
})
