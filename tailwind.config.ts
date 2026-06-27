import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        bdr: 'var(--bdr)',
        'bdr-hi': 'var(--bdr-hi)',
        txt: 'var(--txt)',
        'txt-muted': 'var(--txt-muted)',
        muted: 'var(--muted)',
        dim: 'var(--dim)',
        yellow: 'var(--yellow)',
        'yellow-hover': 'var(--yellow-hover)',
        violet: 'var(--violet)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'Cascadia Code', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--r)',
        lg: 'var(--r-lg)',
      },
    },
  },
  plugins: [],
}

export default config
