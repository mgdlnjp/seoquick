/** Concatène des classes en ignorant les valeurs falsy. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'ghost-dark';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-signal-400 text-ink-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_1px_2px_rgb(10_11_11/0.2)] hover:bg-signal-300 focus-visible:outline-signal-400',
  dark: 'bg-ink-950 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-ink-800 focus-visible:outline-ink-950',
  outline: 'bg-white text-ink-900 ring-1 ring-ink-200 ring-inset shadow-sm hover:bg-ink-50 hover:ring-ink-300 focus-visible:outline-ink-900',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-950 focus-visible:outline-ink-900',
  'ghost-dark': 'text-ink-300 hover:bg-white/10 hover:text-white focus-visible:outline-signal-400',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

/** Classes de bouton (utilisables sur <button> comme sur <a>). */
export function btn(variant: Variant = 'primary', size: Size = 'md', extra?: string): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], extra);
}
