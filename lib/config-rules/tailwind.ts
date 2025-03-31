import { formatRules } from '../utils/format-rules.ts'

export const tailwindRules = formatRules({
  'tailwind/no-duplicate-classes': 'error',
  'tailwind/sort-classes': 'error',
  'tailwind/no-unnecessary-whitespace': 'error',
})
