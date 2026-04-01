/**
 * Build before/after JSON for audit rows — changed keys only.
 */

export function diffRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): {
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
} {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const bj: Record<string, unknown> = {}
  const aj: Record<string, unknown> = {}
  for (const k of keys) {
    const same = JSON.stringify(before[k]) === JSON.stringify(after[k])
    if (!same) {
      if (before[k] !== undefined) bj[k] = before[k] as unknown
      if (after[k] !== undefined) aj[k] = after[k] as unknown
    }
  }
  return {
    beforeJson: Object.keys(bj).length > 0 ? bj : null,
    afterJson: Object.keys(aj).length > 0 ? aj : null,
  }
}
