/** Tailwind CSS v3 configuration (single major version used throughout the project). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', md: '1.5rem', lg: '2rem' }, screens: { lg: '1024px', xl: '1200px' } },
    extend: {
      colors: {
        navy: { DEFAULT: '#00003c', 900: '#00003c', 800: '#0a1245', header: '#000030' },
        ink: '#002134',
        brand: { DEFAULT: '#04256b', 600: '#0a3396', 700: '#061f5e', 50: '#eef4ff', foot: '#092b72' },
        sky: { 50: '#f1f8ff', 100: '#e4f5ff', arch: '#bfe8ff', band: '#bed6ee', 200: '#c9e4fa', 400: '#3ab0f6', 500: '#1c9cf0' },
        deal: '#16b31a', saved: '#16b79c',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], ps: ['Public Sans', 'Inter', 'sans-serif'], display: ['Syne', 'Inter', 'sans-serif'] },
      boxShadow: { card: '0 2px 10px rgba(5,10,48,0.12)' },
      keyframes: { tick: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } }, spin360: { to: { transform: 'rotate(360deg)' } }, floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } }, shine: { '100%': { transform: 'translateX(100%)' } } },
      animation: { tick: 'tick 28s linear infinite', spinslow: 'spin360 22s linear infinite', floaty: 'floaty 5s ease-in-out infinite' },
    },
  },
  plugins: [],
};
