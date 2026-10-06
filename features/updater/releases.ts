import { isNewerRelease } from './version'

export interface Release {
  tag_name: string
  draft: boolean
  prerelease: boolean
  assets: { name: string; browser_download_url: string }[]
}

/** Public APK releases include the prereleases used for direct distribution. */
export function selectLatestApkRelease(values: unknown): Release | null {
  if (!Array.isArray(values)) throw new Error('La respuesta de actualización no es válida.')
  let latest: Release | null = null
  for (const value of values) {
    if (!value || value.draft !== false || typeof value.tag_name !== 'string' || !/^v?\d+\.\d+\.\d+(?:-\d+)?$/.test(value.tag_name) || !Array.isArray(value.assets)) continue
    const assets = value.assets.filter((asset: Release['assets'][number]) => typeof asset?.name === 'string' && asset.name.toLowerCase().endsWith('.apk') && typeof asset.browser_download_url === 'string' && asset.browser_download_url.startsWith('https://github.com/zeta-develop/lotochoco/releases/download/'))
    if (!assets.length) continue
    const release: Release = { tag_name: value.tag_name, draft: false, prerelease: value.prerelease === true, assets }
    if (!latest || isNewerRelease(release.tag_name, latest.tag_name)) latest = release
  }
  return latest
}

let inFlight: Promise<Release> | null = null
export function fetchLatestApkRelease(): Promise<Release> {
  if (!inFlight) {
    inFlight = (async () => {
      const response = await fetch('https://api.github.com/repos/zeta-develop/lotochoco/releases?per_page=30', { cache: 'no-store' })
      if (!response.ok) throw new Error('No se pudo consultar la actualización.')
      const release = selectLatestApkRelease(await response.json())
      if (!release) throw new Error('No hay una versión pública con APK disponible.')
      return release
    })().finally(() => { inFlight = null })
  }
  return inFlight
}
