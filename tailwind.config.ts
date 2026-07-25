import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ground: '#0d1522',
        card: '#152239',
        line: '#2b3e5e',
        ink: '#e6ecf5',
        muted: '#8fa2c0',
        brass: '#d9a441',
        marriedin: '#0f1a2b',
        childlink: '#3d5a7d',
      },
    },
  },
  plugins: [],
}
export default config
