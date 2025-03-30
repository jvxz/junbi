import { formatRules } from '../utils/format-rules.ts'

export const nextjsRules = formatRules({
  '@next/next/no-html-link-for-pages': 'error',
  '@next/next/no-img-element': 'error',
  '@next/next/no-unwanted-polyfillio': 'error',
})
