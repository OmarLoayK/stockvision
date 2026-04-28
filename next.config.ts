import type { NextConfig } from 'next';

const securityHeaders = [
  // Prevent browsers from MIME-sniffing a response away from the declared content-type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Clickjacking protection — disallow embedding in iframes from other origins
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Disable DNS prefetching to reduce information leakage
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Only send the origin as the referrer, never the full URL
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features the app doesn't need
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Force HTTPS for 2 years, include subdomains
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  // - default-src 'self': only load resources from our own origin by default
  // - script-src allows 'unsafe-inline'/'unsafe-eval' because Next.js requires them
  // - connect-src whitelists Supabase and Finnhub (both REST and WebSocket)
  // - frame-ancestors 'none': tighter than X-Frame-Options for modern browsers
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      [
        "connect-src 'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://finnhub.io',
        'wss://ws.finnhub.io',
        'https://api.anthropic.com',
      ].join(' '),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to every route
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Remove the X-Powered-By header so the stack isn't advertised
  poweredByHeader: false,
};

export default nextConfig;
