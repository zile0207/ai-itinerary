import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages for server components
  serverExternalPackages: ['bcryptjs'],
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  },
  
  // Image domains for external images
  images: {
    domains: [
      'images.unsplash.com',
      'lh3.googleusercontent.com', // Google profile images
      'graph.facebook.com' // Facebook profile images
    ]
  }
};

export default nextConfig;
