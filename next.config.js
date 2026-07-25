/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the whole app runs from plain files (zero-backend mode).
  output: 'export',
  trailingSlash: true,
  // Set by CI when deploying under a subpath (e.g. GitHub Pages project site).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
}

module.exports = nextConfig
