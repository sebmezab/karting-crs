import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-pit text-white hover:bg-pit-dark disabled:bg-asphalt-soft/50',
  secondary:
    'bg-white text-asphalt border-2 border-asphalt hover:bg-concrete disabled:border-line disabled:text-asphalt-soft',
  success: 'bg-go text-white hover:brightness-95 disabled:opacity-50',
  danger: 'bg-stop text-white hover:brightness-95 disabled:opacity-50',
  ghost: 'bg-transparent text-pit underline-offset-4 hover:underline disabled:opacity-50',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** "lg" para acciones principales en pista (≥ 56 px). */
  size?: 'md' | 'lg'
  block?: boolean
}

/** Botón con objetivo táctil ≥ 48 px (SPEC 11.3: ≥ 44 px). */
export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const sizing = size === 'lg' ? 'min-h-14 px-6 text-lg' : 'min-h-12 px-4 text-base'
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors disabled:cursor-not-allowed ${sizing} ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    />
  )
}
