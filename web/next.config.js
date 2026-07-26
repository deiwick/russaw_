/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Statically exports to 'out' folder for Netlify
  trailingSlash: true, // Exports pages as [route]/index.html for clean URLs on static hosts
};

module.exports = nextConfig;
