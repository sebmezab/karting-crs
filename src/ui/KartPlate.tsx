/**
 * Placa de número de kart: el elemento distintivo de la interfaz. El color de la placa
 * identifica la categoría, como las placas reales en pista.
 */
const PLATE_COLORS: Record<string, string> = {
  'cat-micro': 'bg-[#f07d00] text-black',
  'cat-mini': 'bg-[#6b3fa0] text-white',
  'cat-junior': 'bg-[#ffd200] text-black',
  'cat-senior': 'bg-white text-black ring-2 ring-inset ring-black',
  'cat-dd2-senior': 'bg-[#1450a3] text-white',
  'cat-dd2-master': 'bg-black text-[#ffd200]',
  'cat-dd2-xl': 'bg-[#0b6e6e] text-white',
  'cat-dd2-promo': 'bg-[#8a8f94] text-white',
}

const SIZES = {
  sm: 'min-w-12 h-9 text-xl px-1.5',
  md: 'min-w-16 h-12 text-3xl px-2',
  lg: 'min-w-24 h-18 text-5xl px-3',
}

export function KartPlate({
  number,
  categoryId,
  size = 'md',
}: {
  number: number
  categoryId: string
  size?: keyof typeof SIZES
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-display leading-none font-extrabold tabular-nums ${SIZES[size]} ${PLATE_COLORS[categoryId] ?? 'bg-white text-black ring-2 ring-inset ring-black'}`}
      aria-label={`Kart ${number}`}
    >
      {number}
    </span>
  )
}
