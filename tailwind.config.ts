import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ground: '#ffffff',
        card: '#faf9f6',
        line: '#dcdfe6',
        ink: '#1c2635',
        muted: '#6b7a92',
        brass: '#a97b1e',
        marriedin: '#f4f2ed',
        childlink: '#9db1c9',
      },
    },
  },
  plugins: [],
}
export default config
