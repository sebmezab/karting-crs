import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 24, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)
export const IconAlert = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l10 18H2L12 3z" />
    <path d="M12 10v4.5M12 17.5v.01" />
  </svg>
)
export const IconStop = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 2.5h8l5.5 5.5v8L16 21.5H8L2.5 16V8L8 2.5z" />
    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
  </svg>
)
export const IconShield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.5l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6l8-3z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </svg>
)
export const IconCamera = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8h3.5L8 5.5h8L17.5 8H21v11H3V8z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
)
export const IconClose = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconMessage = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5h16v11H9l-5 4V5z" />
  </svg>
)
export const IconFlag = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 21V4M5 4h13l-2.5 4L18 12H5" />
  </svg>
)
export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l5 5" />
  </svg>
)
export const IconUndo = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h10a6 6 0 010 12" transform="translate(0 -6)" />
  </svg>
)
