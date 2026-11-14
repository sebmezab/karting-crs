/**
 * Datos de ejemplo del Campeonato Regional Sur 2026 (SPEC §9).
 * Pilotos y staff FICTICIOS. Determinista: siempre genera lo mismo.
 */
import { expandPermissionPatterns, ROLE_TEMPLATES } from '@/domain/permissions'
import { CRS_2026_RULES } from '@/domain/rules'
import { TIRE_POSITIONS, type TirePosition } from '@/domain/tires'
import { DEMO_IDS } from '../demo'
import type {
  Category,
  Championship,
  ChampionshipEntry,
  DriverProfile,
  Equipment,
  EventEntry,
  EventEquipment,
  EventStaff,
  Organization,
  Person,
  RaceEvent,
  RaceSession,
  Role,
  StandingsRow,
  TireSet,
} from '../types'
import type { MockState } from './mockState'

const ORG = DEMO_IDS.organization
const CH = DEMO_IDS.championship
const F6 = DEMO_IDS.currentEvent

const organization: Organization = {
  id: ORG,
  name: 'Organización Campeonato Regional Sur',
  slug: 'crs',
}

const championship: Championship = {
  id: CH,
  organizationId: ORG,
  name: 'Campeonato Regional Sur 2026',
  seasonYear: 2026,
  status: 'active',
  rules: CRS_2026_RULES,
}

const CATEGORY_DEFS = [
  ['cat-micro', 'Micro Max', 1, 49, 'MG', 'SC2'],
  ['cat-mini', 'Mini Max', 50, 99, 'MG', 'SC2'],
  ['cat-junior', 'Junior Max', 101, 199, 'MG', 'SI (blancos)'],
  ['cat-senior', 'Senior Max', 201, 299, 'MG', 'SI'],
  ['cat-dd2-senior', 'DD2 Senior', 301, 399, 'MG', 'SI'],
  ['cat-dd2-master', 'DD2 Master', 401, 499, 'MG', 'SI'],
  ['cat-dd2-xl', 'DD2 Super Master XL', 501, 599, 'MG', 'SI'],
  ['cat-dd2-promo', 'DD2 Promocional', 601, 699, 'MG', 'SI'],
] as const

const categories: Category[] = CATEGORY_DEFS.map(([id, name, min, max, brand, model], i) => ({
  id,
  championshipId: CH,
  name,
  numberMin: min,
  numberMax: max,
  tireBrand: brand,
  tireModel: model,
  sortOrder: i + 1,
}))

const VENUE = 'Kartódromo Concepción'

function event(round: number, date: string, opts: Partial<RaceEvent> = {}): RaceEvent {
  return {
    id: `ev-2026-f${round}`,
    championshipId: CH,
    roundNumber: round,
    date,
    venue: VENUE,
    countsForPoints: true,
    countsForTireCycle: true,
    isTireChangeEvent: null,
    registrationDeadline: `${date}T02:59:00Z`,
    status: 'official',
    note: null,
    ...opts,
  }
}

const events: RaceEvent[] = [
  event(1, '2026-02-21', {
    countsForPoints: false,
    countsForTireCycle: false,
    note: 'Fecha de verano: no suma puntos ni cuenta para el ciclo de neumáticos.',
  }),
  event(2, '2026-03-21'),
  event(3, '2026-05-23'),
  event(4, '2026-08-22'),
  event(5, '2026-10-10'),
  event(6, '2026-11-21', {
    countsForPoints: false,
    // Demo: F6 se trata como continuación del juego de F4 (override manual) para poder
    // mostrar la validación de neumáticos. Según la regla calculada sería fecha de cambio.
    isTireChangeEvent: false,
    registrationDeadline: '2026-11-19T02:59:00Z', // miércoles 18-11-2026 23:59 (Chile)
    status: 'open',
    note: 'Fecha de prueba del sistema (en paralelo al papel).',
  }),
]

type DriverDef = [kart: number, fullName: string, birthYear: number]

const DRIVERS: Record<string, DriverDef[]> = {
  'cat-junior': [
    [101, 'Tomás Rivas', 2012],
    [104, 'Martina Lagos', 2013],
    [112, 'Benjamín Soto', 2011],
    [118, 'Isidora Muñoz', 2012],
    [125, 'Joaquín Herrera', 2013],
    [133, 'Florencia Vega', 2011],
  ],
  'cat-senior': [
    [203, 'Vicente Castro', 2009],
    [207, 'Agustín Núñez', 2007],
    [215, 'Emilia Contreras', 2008],
    [222, 'Lucas Morales', 2006],
    [231, 'Maximiliano Araya', 2010],
    [244, 'Renata Silva', 2005],
  ],
  'cat-dd2-senior': [
    [312, 'Ana Torres', 1996],
    [318, 'Sofía Paredes', 1999],
    [327, 'Bruno Méndez', 1994],
    [341, 'Camilo Reyes', 1998],
    [355, 'Daniela Ortiz', 2000],
    [366, 'Esteban Pizarro', 1997],
    [372, 'Gonzalo Espinoza', 1993],
  ],
  'cat-dd2-master': [
    [401, 'Rodrigo Valenzuela', 1982],
    [408, 'Claudio Sepúlveda', 1979],
    [415, 'Patricio Cárdenas', 1985],
    [423, 'Andrés Figueroa', 1981],
    [436, 'Felipe Guzmán', 1984],
    [448, 'Mauricio Tapia', 1977],
  ],
}

/** Pilotos sin historial previo en la temporada (ingreso tardío). */
const LATE_ENTRY_KARTS = new Set([366])
/** Piloto de la demo: aún no inscrito en F6 (para mostrar el flujo de inscripción). */
const NOT_YET_IN_F6 = new Set([318])

const STAFF: [id: string, name: string][] = [
  [DEMO_IDS.techInspector, 'Diego Fuentes'],
  [DEMO_IDS.steward, 'Carla Rojas'],
  [DEMO_IDS.timekeeper, 'Marcelo Vidal'],
  [DEMO_IDS.technicalDirector, 'Pablo Navarro'],
  [DEMO_IDS.admin, 'Javiera Campos'],
]

const CHASSIS_BRANDS = ['Tony Kart', 'CRG', 'Birel ART', 'Kart Republic', 'Praga'] as const

function slug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-')
}

function engineModel(categoryId: string): string {
  if (categoryId === 'cat-junior') return 'Junior Max EVO'
  if (categoryId === 'cat-senior') return 'Senior Max EVO'
  return 'DD2 EVO'
}

/** PRNG determinista (LCG) para la tabla estática. */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a !== undefined && b !== undefined) {
      out[i] = b
      out[j] = a
    }
  }
  return out
}

const PREFINAL_POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1]
const FINAL_POINTS = [15, 12, 10, 8, 7, 6, 5, 3, 2, 1]

export function buildSeed(): MockState {
  const people: Person[] = []
  const driverProfiles: DriverProfile[] = []
  const championshipEntries: ChampionshipEntry[] = []
  const eventEntries: EventEntry[] = []
  const equipment: Equipment[] = []
  const eventEquipment: EventEquipment[] = []
  const tireSets: TireSet[] = []

  for (const [id, fullName] of STAFF) {
    people.push({
      id,
      fullName,
      email: `${slug(fullName).replace('-', '.')}@example.com`,
      phone: null,
      birthYear: null,
      guardianPersonId: null,
    })
  }

  let brandIndex = 0
  for (const [categoryId, drivers] of Object.entries(DRIVERS)) {
    for (const [kart, fullName, birthYear] of drivers) {
      const personId = `p-${slug(fullName)}`
      const isMinor = 2026 - birthYear < 18
      let guardianPersonId: string | null = null
      if (isMinor) {
        guardianPersonId = `${personId}-tutor`
        people.push({
          id: guardianPersonId,
          fullName: `Tutor/a de ${fullName.split(' ')[0] ?? fullName}`,
          email: `tutor.${slug(fullName).replace('-', '.')}@example.com`,
          phone: null,
          birthYear: null,
          guardianPersonId: null,
        })
      }
      people.push({
        id: personId,
        fullName,
        email: `${slug(fullName).replace('-', '.')}@example.com`,
        phone: null,
        birthYear,
        guardianPersonId,
      })
      driverProfiles.push({
        personId,
        licenseNumber: `FADECH-26-${String(kart).padStart(4, '0')}`,
        team: null,
      })

      const ceId = `ce-${kart}`
      championshipEntries.push({
        id: ceId,
        championshipId: CH,
        categoryId,
        personId,
        kartNumber: kart,
        status: 'active',
      })

      // Equipos: 2 chasis y 2 motores (la piloto de demo tiene 3 motores para mostrar el límite).
      const engines = NOT_YET_IN_F6.has(kart) ? 3 : 2
      for (let i = 1; i <= 2; i++) {
        equipment.push({
          id: `eq-ch-${kart}-${i}`,
          organizationId: ORG,
          ownerPersonId: personId,
          type: 'chassis',
          serialNumber: `CH-${kart}-${i}`,
          barcode: null,
          brand: CHASSIS_BRANDS[brandIndex % CHASSIS_BRANDS.length] ?? 'CRG',
          model: '2026',
          tireKind: null,
          sealNumber: null,
        })
      }
      brandIndex += 1
      for (let i = 1; i <= engines; i++) {
        equipment.push({
          id: `eq-en-${kart}-${i}`,
          organizationId: ORG,
          ownerPersonId: personId,
          type: 'engine',
          serialNumber: `EN-${kart}-${i}`,
          barcode: null,
          brand: 'Rotax',
          model: engineModel(categoryId),
          tireKind: null,
          // El 3er motor de la piloto de demo no tiene sello vigente.
          sealNumber: i <= 2 ? `S-${kart}-${i}` : null,
        })
      }

      const tire = (cycle: string, n: number): Equipment => ({
        id: `eq-ti-${kart}-${cycle}${n}`,
        organizationId: ORG,
        ownerPersonId: personId,
        type: 'tire',
        serialNumber: `MG-${kart}-${cycle}${n}`,
        barcode: `MG-${kart}-${cycle}${n}`,
        brand: 'MG',
        model: categories.find((c) => c.id === categoryId)?.tireModel ?? 'SI',
        tireKind: 'slick',
        sealNumber: null,
      })

      if (!LATE_ENTRY_KARTS.has(kart)) {
        // Historial: F2–F5. Ciclo F2–F3 (juego "B", cerrado) y F4–F5 (juego "A", activo).
        for (const round of [2, 3, 4, 5]) {
          const eeId = `ee-f${round}-${kart}`
          eventEntries.push({
            id: eeId,
            eventId: `ev-2026-f${round}`,
            championshipEntryId: ceId,
            status: 'confirmed',
            lateFee: false,
            lateFeeClp: 0,
            paid: true,
            // Antes del cierre (T02:59Z del día de la fecha).
            registeredAt: `${events[round - 1]?.date ?? '2026-01-01'}T00:00:00Z`,
          })
          const cycle = round <= 3 ? 'B' : 'A'
          TIRE_POSITIONS.forEach((position: TirePosition, idx) => {
            eventEquipment.push({
              id: `eqe-f${round}-${kart}-${position}`,
              eventEntryId: eeId,
              equipmentId: `eq-ti-${kart}-${cycle}${idx + 1}`,
              role: 'tire',
              tirePosition: position,
              registeredBy: DEMO_IDS.techInspector,
              registeredAt: `${events[round - 1]?.date ?? '2026-01-01'}T13:00:00Z`,
              validationStatus: 'ok',
              validationMessages: [],
            })
          })
        }
        for (const cycle of ['B', 'A'] as const) {
          for (let n = 1; n <= 4; n++) equipment.push(tire(cycle, n))
          tireSets.push({
            id: `ts-${kart}-${cycle}`,
            championshipEntryId: ceId,
            cycleStartEventId: cycle === 'B' ? 'ev-2026-f2' : 'ev-2026-f4',
            tireKind: 'slick',
            status: cycle === 'B' ? 'closed' : 'active',
            items: TIRE_POSITIONS.map((position, idx) => ({
              position,
              equipmentId: `eq-ti-${kart}-${cycle}${idx + 1}`,
              replacedInEventId: null,
            })),
          })
        }
      }

      if (!NOT_YET_IN_F6.has(kart)) {
        const eeId = `ee-f6-${kart}`
        eventEntries.push({
          id: eeId,
          eventId: F6,
          championshipEntryId: ceId,
          status: 'confirmed',
          lateFee: false,
          lateFeeClp: 0,
          paid: true,
          registeredAt: '2026-11-10T22:00:00Z',
        })
        for (const [role, eqId] of [
          ['chassis_1', `eq-ch-${kart}-1`],
          ['engine_1', `eq-en-${kart}-1`],
        ] as const) {
          eventEquipment.push({
            id: `eqe-f6-${kart}-${role}`,
            eventEntryId: eeId,
            equipmentId: eqId,
            role,
            tirePosition: null,
            registeredBy: personId,
            registeredAt: '2026-11-10T22:00:00Z',
            validationStatus: 'ok',
            validationMessages: [],
          })
        }
      }
    }
  }

  const roles: Role[] = ROLE_TEMPLATES.map((t) => ({
    id: t.id,
    organizationId: null,
    name: t.name,
    description: t.description,
    isTemplate: true,
    permissions: [...expandPermissionPatterns(t.permissions)],
  }))

  const eventStaff: EventStaff[] = [
    { eventId: F6, personId: DEMO_IDS.techInspector, roleId: 'tpl-tech-inspector' },
    { eventId: F6, personId: DEMO_IDS.steward, roleId: 'tpl-steward' },
    { eventId: F6, personId: DEMO_IDS.timekeeper, roleId: 'tpl-timekeeper' },
    { eventId: F6, personId: DEMO_IDS.technicalDirector, roleId: 'tpl-technical-director' },
    { eventId: F6, personId: DEMO_IDS.admin, roleId: 'tpl-race-director' },
    { eventId: F6, personId: DEMO_IDS.admin, roleId: 'tpl-secretary' },
    // El staff cambia por fecha: en F5 Diego fue cronometrista.
    { eventId: 'ev-2026-f5', personId: DEMO_IDS.techInspector, roleId: 'tpl-timekeeper' },
  ]

  const sessions: RaceSession[] = []
  const sessionDefs = [
    ['practice', 'Práctica libre', '12:00', 'finished'],
    ['qualifying', 'Clasificación', '14:00', 'running'],
    ['prefinal', 'Prefinal', '16:00', 'scheduled'],
    ['final', 'Final', '17:30', 'scheduled'],
  ] as const
  Object.keys(DRIVERS).forEach((categoryId, catIdx) => {
    for (const [type, name, time, status] of sessionDefs) {
      const [h, m] = time.split(':').map(Number)
      const minutes = (h ?? 12) * 60 + (m ?? 0) + catIdx * 20 + 180 // hora Chile → UTC (+3 h)
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
      const mm = String(minutes % 60).padStart(2, '0')
      sessions.push({
        id: `se-f6-${categoryId}-${type}`,
        eventId: F6,
        categoryId,
        type,
        name,
        scheduledAt: `2026-11-21T${hh}:${mm}:00Z`,
        status,
      })
    }
  })

  const standings: StandingsRow[] = []
  Object.entries(DRIVERS).forEach(([categoryId, drivers], catIdx) => {
    const rand = seededRandom(2026 + catIdx * 97)
    const withHistory = drivers.filter(([kart]) => !LATE_ENTRY_KARTS.has(kart))
    const points = new Map<number, Record<number, number | null>>()
    for (const round of [2, 3, 4, 5]) {
      shuffled(withHistory, rand).forEach(([kart], pos) => {
        const row = points.get(kart) ?? {}
        row[round] = (PREFINAL_POINTS[pos] ?? 0) + (FINAL_POINTS[pos] ?? 0) + 1
        points.set(kart, row)
      })
    }
    for (const [kart] of drivers) {
      const byRound = points.get(kart) ?? { 2: null, 3: null, 4: null, 5: null }
      const scored = Object.entries(byRound).filter(
        (e): e is [string, number] => typeof e[1] === 'number',
      )
      // Descarte de la peor fecha (preset CRS: 1 descarte).
      const worst = scored.reduce<[string, number] | null>(
        (min, e) => (min === null || e[1] < min[1] ? e : min),
        null,
      )
      const total = scored.reduce((sum, [, p]) => sum + p, 0) - (worst?.[1] ?? 0)
      standings.push({
        categoryId,
        championshipEntryId: `ce-${kart}`,
        pointsByRound: byRound,
        droppedRound: worst ? Number(worst[0]) : null,
        total,
      })
    }
  })

  return {
    version: 1,
    organization,
    championship,
    categories,
    events,
    people,
    driverProfiles,
    championshipEntries,
    eventEntries,
    equipment,
    eventEquipment,
    tireSets,
    exceptions: [],
    sessions,
    sessionResults: [],
    inspections: [],
    roles,
    eventStaff,
    standings,
    auditLog: [],
  }
}
