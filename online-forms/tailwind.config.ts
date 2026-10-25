import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NEXA teal, tuned for AA contrast on white at 600+.
        brand: {
          50: '#eef8f8',
          100: '#d4eeee',
          200: '#acdcdc',
          300: '#7ac3c4',
          400: '#46a6a8',
          500: '#2b8f91',
          600: '#1f7577',
          700: '#1c5f61',
          800: '#1b4d4f',
          900: '#1a4143',
        },
        // NEXA slate (the dark band on the spec cover).
        slate: {
          950: '#1d2129',
          900: '#272c36',
          850: '#2f3540',
          800: '#373d49',
        },
        canvas: '#f5f7f8',
        line: '#e3e8ec',
        ink: '#1d2430',
        muted: '#647182',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // Finer steps than Tailwind 3.3 ships, used for overlays and focus rings.
      opacity: { 15: '.15', 35: '.35', 45: '.45', 55: '.55', 65: '.65', 85: '.85' },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)',
        lift: '0 4px 8px -2px rgba(16,24,40,.08), 0 12px 24px -6px rgba(16,24,40,.12)',
        pop: '0 20px 48px -12px rgba(16,24,40,.28)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'drop-in': { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '60%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out',
        'rise-in': 'rise-in .18s cubic-bezier(.2,.8,.2,1)',
        'slide-in': 'slide-in .22s cubic-bezier(.2,.8,.2,1)',
        'drop-in': 'drop-in .3s cubic-bezier(.2,.8,.2,1)',
        pop: 'pop .45s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
}
export default config
