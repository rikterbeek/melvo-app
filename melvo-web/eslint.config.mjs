import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  { ignores: ['.next/**', 'coverage/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextCoreWebVitals,
  {
    rules: {
      // The primary CTA destination is a configured URL that may point off-site,
      // so it is a plain anchor rather than a next/link route.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]

export default config
