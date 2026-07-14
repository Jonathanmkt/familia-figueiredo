import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Build standalone: gera um servidor mínimo + node_modules podado em
  // .next/standalone — imagem Docker muito menor (roda com `node server.js`).
  output: 'standalone',
};

export default nextConfig;
