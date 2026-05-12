import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base:     '#0D0F14',
        surface:  '#161B22',
        elevated: '#1C2333',
        overlay:  '#242E42',
        primary: {
          DEFAULT: '#6366F1',
          hover:   '#4F46E5',
          muted:   'rgba(99,102,241,0.1)',
        },
        'focus-green': '#22C55E',
        'break-amber': '#F59E0B',
        'xp-gold':     '#EAB308',
        danger:        '#EF4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 30px rgba(99,102,241,0.35)',
        'glow-green':   '0 0 25px rgba(34,197,94,0.4)',
        'glow-gold':    '0 0 20px rgba(234,179,8,0.3)',
      },
      animation: {
        'ping-slow':  'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        float:        'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), ' +
          'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
    },
  },
  plugins: [],
}

export default config
