/** @type {import('next').NextConfig} */

// Content Security Policy
// - 'unsafe-inline' on script-src is required by Next.js App Router (hydration inline scripts).
//   This still meaningfully hardens the app by blocking unknown external script sources.
// - Stripe requires js.stripe.com for scripts and both js/hooks.stripe.com for frames.
// - Supabase requires *.supabase.co for HTTPS + WSS connections.
// - Vercel Analytics requires va.vercel-scripts.com and vitals.vercel-insights.com.
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Content-Security-Policy", value: ContentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
