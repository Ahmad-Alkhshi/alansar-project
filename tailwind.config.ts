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
        primary: {
          DEFAULT: '#2D6A4F',
          dark: '#1B4332',
          light: '#40916C',
        },
        secondary: {
          DEFAULT: '#E76F51',
          light: '#F4A261',
        },
        success: '#52B788',
        error: '#D62828',
        warning: '#F77F00',
      },
      fontSize: {
        'base': '18px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '32px',
      },
    },
  },
  plugins: [],
}
export default config
