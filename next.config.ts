import type {NextConfig} from 'next';

// Portal-framed HIRAC: allow this origin plus the iScout portal. No subdomain wildcard.
const frameAncestors = "'self' https://iscoutapp.co https://dash.iscoutapp.co";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel.live",
  "script-src-elem 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https: data: blob: https://vercel.live https://*.vercel.live",
  "frame-src 'self' https://vercel.live https://*.vercel.live",
  `frame-ancestors ${frameAncestors}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  {key: 'Content-Security-Policy', value: contentSecurityPolicy},
  // SAMEORIGIN for older browsers; CSP frame-ancestors is the portal allowlist.
  {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
  {key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload'},
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()'},
];

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
        {
            protocol: 'https',
            hostname: 'placehold.co',
        },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      "https://*.cloudworkstations.dev",
      "https://*.firebase.studio",
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
