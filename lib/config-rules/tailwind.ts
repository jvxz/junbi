import { formatRules } from '../utils/format-rules.ts'

export const tailwindRules = formatRules({
  'readable-tailwind/no-duplicate-classes': 'error',
  'readable-tailwind/sort-classes': 'error',
  'readable-tailwind/no-unnecessary-whitespace': 'error',
})
