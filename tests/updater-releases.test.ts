import { describe, expect, it } from 'vitest'
import { selectLatestApkRelease } from '@/features/updater/releases'

const release = (tag: string, prerelease = false, draft = false) => ({ tag_name: tag, prerelease, draft, assets: [{ name: 'app-release.apk', browser_download_url: `https://github.com/zeta-develop/lotochoco/releases/download/${tag}/app-release.apk` }] })

describe('public APK updates', () => {
  it('finds newer public prereleases instead of the older stable release', () => {
    expect(selectLatestApkRelease([release('v1.8.6-172'), release('v1.8.9-177', true)])?.tag_name).toBe('v1.8.9-177')
  })
  it('compares numeric versions and builds regardless of API order', () => {
    expect(selectLatestApkRelease([release('v1.8.9-177', true), release('v1.8.10-179', true), release('v1.8.8-176', true)])?.tag_name).toBe('v1.8.10-179')
  })
  it('skips drafts, invalid tags and releases without a trusted APK', () => {
    expect(selectLatestApkRelease([release('v1.8.11-180', true, true), release('latest'), { ...release('v1.8.12-181'), assets: [] }, { ...release('v1.8.13-182'), assets: [{ name: 'app.apk', browser_download_url: 'https://example.com/app.apk' }] }, release('v1.8.9-177', true)])?.tag_name).toBe('v1.8.9-177')
  })
  it('handles an empty list and rejects malformed API responses', () => {
    expect(selectLatestApkRelease([])).toBeNull()
    expect(() => selectLatestApkRelease({})).toThrow('no es válida')
  })
})
