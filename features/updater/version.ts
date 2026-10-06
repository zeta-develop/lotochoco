/** Release tags are v<major>.<minor>.<patch>-<Android versionCode>. */
export function isNewerRelease(latest: string, current: string): boolean {
  const parse = (value: string) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(value)
    return match ? match.slice(1).map(part => Number(part || 0)) : null
  }
  const next = parse(latest)
  const installed = parse(current)
  if (!next || !installed) return false
  // Android rejects a lower/equal versionCode even when versionName increases.
  if (installed[3] && next[3]) return next[3] > installed[3]
  for (let i = 0; i < 4; i++) {
    if (next[i] !== installed[i]) return next[i] > installed[i]
  }
  return false
}
