import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  getUri: vi.fn(), stat: vi.fn(), readFile: vi.fn(), deleteFile: vi.fn(), writeFile: vi.fn(),
  addListener: vi.fn(), downloadFile: vi.fn(), remove: vi.fn(),
}))
vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Filesystem: mocks }))
vi.mock('@capacitor/file-transfer', () => ({ FileTransfer: mocks }))
import { downloadApk } from '../features/updater/download'
const url = 'https://github.com/zeta-develop/lotochoco/releases/download/v1.8.6-128/app.apk'
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUri.mockResolvedValue({ uri: 'file:///cache/app.apk' })
  mocks.stat.mockRejectedValue(new Error('not found'))
  mocks.readFile.mockRejectedValue(new Error('not found'))
  mocks.deleteFile.mockResolvedValue(undefined)
  mocks.writeFile.mockResolvedValue(undefined)
  mocks.addListener.mockResolvedValue({ remove: mocks.remove })
  mocks.downloadFile.mockResolvedValue(undefined)
})
describe('APK transfer recovery', () => {
  it('reuses a completed APK instead of downloading again after installer failure', async () => {
    mocks.stat.mockResolvedValue({ type: 'file', size: 1024 })
    mocks.readFile.mockResolvedValue({ data: btoa(url) })
    expect(await downloadApk(url, 'app.apk', vi.fn())).toBe('file:///cache/app.apk')
    expect(mocks.downloadFile).not.toHaveBeenCalled()
  })
  it('does not reuse a partial file without a completion marker', async () => {
    mocks.stat.mockResolvedValue({ type: 'file', size: 1024 })
    await downloadApk(url, 'app.apk', vi.fn())
    expect(mocks.downloadFile).toHaveBeenCalledOnce()
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'app.apk.complete', data: btoa(url) }))
    expect(mocks.remove).toHaveBeenCalledOnce()
  })
  it('cleans a failed transfer and removes the progress listener', async () => {
    mocks.downloadFile.mockRejectedValue(new Error('network failed'))
    await expect(downloadApk(url, 'app.apk', vi.fn())).rejects.toThrow('network failed')
    expect(mocks.deleteFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'app.apk' }))
    expect(mocks.remove).toHaveBeenCalledOnce()
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })
  it('rejects downloads outside the application release repository', async () => {
    await expect(downloadApk('https://attacker.example/app.apk', 'app.apk', vi.fn())).rejects.toThrow('repositorio')
    expect(mocks.downloadFile).not.toHaveBeenCalled()
  })
})
