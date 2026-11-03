import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 1. Web Pages percent-encoded %40 normalization
      {
        source: '/%40:username/pages/:slug/click/:blockId',
        destination: '/@:username/pages/:slug/click/:blockId',
        permanent: true,
      },
      {
        source: '/%40:username/pages/:slug/submit/:blockId',
        destination: '/@:username/pages/:slug/submit/:blockId',
        permanent: true,
      },
      {
        source: '/%40:username/pages/:slug',
        destination: '/@:username/pages/:slug',
        permanent: true,
      },

      // 2. Bio Links percent-encoded %40 normalization
      {
        source: '/%40:username/links/:linkId',
        destination: '/@:username/links/:linkId',
        permanent: true,
      },
      {
        source: '/%40:username/:slug',
        destination: '/@:username/:slug',
        permanent: true,
      },
      {
        source: '/%40:username',
        destination: '/@:username',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // 1. Web Pages (highest precedence, 3 segments)
      {
        source: '/@:username/pages/:slug/click/:blockId',
        destination: '/pages/:username/:slug/click/:blockId',
      },
      {
        source: '/@:username/pages/:slug/submit/:blockId',
        destination: '/pages/:username/:slug/submit/:blockId',
      },
      {
        source: '/@:username/pages/:slug',
        destination: '/pages/:username/:slug',
      },

      // 2. Bio Links Click tracking route
      {
        source: '/@:username/links/:linkId',
        destination: '/bio/:username/links/:linkId',
      },
      // 3. Bio Links Secondary card vanity route (e.g. /@alex/course-launch)
      {
        source: '/@:username/:slug',
        destination: '/bio/:username/:slug',
      },
      // 4. Bio Links Primary card vanity route (e.g. /@alex)
      {
        source: '/@:username',
        destination: '/bio/:username',
      },

      // Compatibility rewrites for %40 if proxies do not follow redirects
      {
        source: '/%40:username/pages/:slug/click/:blockId',
        destination: '/pages/:username/:slug/click/:blockId',
      },
      {
        source: '/%40:username/pages/:slug/submit/:blockId',
        destination: '/pages/:username/:slug/submit/:blockId',
      },
      {
        source: '/%40:username/pages/:slug',
        destination: '/pages/:username/:slug',
      },
      {
        source: '/%40:username/links/:linkId',
        destination: '/bio/:username/links/:linkId',
      },
      {
        source: '/%40:username/:slug',
        destination: '/bio/:username/:slug',
      },
      {
        source: '/%40:username',
        destination: '/bio/:username',
      },
    ];
  },
};

export default nextConfig;
