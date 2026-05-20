/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Engie-inspired palette
        // Engie cyan blue is iconic; pair with deep navy + magenta accent
        engie: {
          blue: '#00BDFF',      // primary Engie cyan/blue (matches official logo fill)
          deep: '#003D7C',      // deep blue, headlines
          navy: '#001E62',      // darkest navy, text on light
          glow: '#5BD7FF',      // light cyan glow
          magenta: '#E5005B',   // accent (Engie pink-magenta)
          coral: '#FF7A59',     // warm accent
          green: '#00C389',     // positive / "green energy"
        },
        ink: '#0A1A2F',
        mist: '#F4F7FB',
        paper: '#F9FBFD',
        // Databricks subtle accents
        dbx: {
          red: '#FF3621',
          teal: '#1B5161',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grid-faint':
          "linear-gradient(rgba(0,30,98,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,30,98,0.04) 1px, transparent 1px)",
        'engie-gradient': 'linear-gradient(135deg, #00BDFF 0%, #003D7C 60%, #001E62 100%)',
        'magenta-gradient': 'linear-gradient(135deg, #E5005B 0%, #FF7A59 100%)',
      },
      boxShadow: {
        glow: '0 0 60px -10px rgba(0,189,255,0.45)',
        soft: '0 8px 24px -10px rgba(0,30,98,0.20)',
      },
      animation: {
        'gradient-shift': 'gradientShift 14s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
        'draw-line': 'drawLine 1.6s ease-out forwards',
        shimmer: 'shimmer 3s linear infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-10px) scale(1.02)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.85' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '600' },
          '100%': { strokeDashoffset: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
