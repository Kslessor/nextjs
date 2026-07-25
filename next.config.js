/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the whole app runs from plain files (zero-backend mode).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

module.exports = nextConfig
