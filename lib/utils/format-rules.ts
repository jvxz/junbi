export function formatRules(rules: Record<string, unknown>) {
  return `${JSON.stringify(rules).slice(1, -1)},`
}
