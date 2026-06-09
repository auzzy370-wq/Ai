import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        neural: {
          50: '#edfeff',
          100: '#d1fbff',
          200: '#a8f4ff',
          300: '#6aebff',
          400: '#22d7ff',
          500: '#00b8e6',
          600: '#0092c3',
          700: '#00749e',
          800: '#045e81',
          900: '#094e6c',
          950: '#053249',
        },
        synapse: {
          active: '#00ffff',
          inactive: '#1a3a4a',
          pulse: '#7fffff',
        },
        agent: {
          ceo: '#4fc3f7',
          coo: '#81c784',
          cto: '#9575cd',
          cfo: '#ffb74d',
          cmo: '#f06292',
          sales: '#4db6ac',
          research: '#aed581',
          support: '#7986cb',
        },
        region: {
          prefrontal: '#4fc3f7',
          hippocampus: '#ab47bc',
          temporal: '#26a69a',
          visual: '#ef5350',
          parietal: '#66bb6a',
          amygdala: '#ff7043',
          basal: '#ffa726',
          motor: '#42a5f5',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'Exo 2', 'Inter', 'sans-serif'],
      },
      animation: {
        'neural-pulse': 'neural-pulse 2s ease-in-out infinite',
        'synaptic-fire': 'synaptic-fire 0.5s ease-out',
        'brain-glow': 'brain-glow 3s ease-in-out infinite',
        'data-stream': 'data-stream 1s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
      },
      keyframes: {
        'neural-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'synaptic-fire': {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
          '100%': { opacity: '0', transform: 'scale(1)' },
        },
        'brain-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)' },
          '50%': { boxShadow: '0 0 60px rgba(0, 255, 255, 0.8)' },
        },
        'data-stream': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'neural-grid': `
          linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px)
        `,
        'cyber-gradient': 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 50%, #0a0e1a 100%)',
        'neural-radial': 'radial-gradient(circle at center, rgba(0, 255, 255, 0.1) 0%, transparent 70%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neural': '0 0 20px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.05)',
        'neural-lg': '0 0 40px rgba(0, 255, 255, 0.3), inset 0 0 40px rgba(0, 255, 255, 0.1)',
        'agent-active': '0 0 30px rgba(79, 195, 247, 0.5)',
      },
    },
  },
  plugins: [],
}

export default config
