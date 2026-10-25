/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: the prototype runs entirely in the browser (localStorage-backed).
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
}

module.exports = nextConfig
