import { Directory, Filesystem } from '@capacitor/filesystem'
import { FileTransfer } from '@capacitor/file-transfer'

/** Retain a completed APK when opening the installer fails; never reuse partial transfers. */
export async function downloadApk(url: string, path: string, onProgress: (progress: number) => void) {
  const source = new URL(url)
  if (source.protocol !== 'https:' || source.hostname !== 'github.com' || !source.pathname.startsWith('/zeta-develop/lotochoco/releases/download/')) {
    throw new Error('El APK no pertenece al repositorio de actualizaciones.')
  }
  const uri = await Filesystem.getUri({ path, directory: Directory.Cache })
  const marker = `${path}.complete`
  try {
    const [saved, complete] = await Promise.all([
      Filesystem.stat({ path, directory: Directory.Cache }),
      Filesystem.readFile({ path: marker, directory: Directory.Cache }),
    ])
    if (saved.type === 'file' && saved.size > 0 && complete.data === btoa(url)) {
      onProgress(100)
      return uri.uri
    }
  } catch { /* No verified completed transfer exists yet. */ }
  // Remove an old completion marker before replacing the file.
  await Filesystem.deleteFile({ path: marker, directory: Directory.Cache }).catch(() => {})
  const listener = await FileTransfer.addListener('progress', progress => {
    if (progress.contentLength) onProgress(Math.min(100, Math.round(progress.bytes / progress.contentLength * 100)))
  })
  try {
    await FileTransfer.downloadFile({ url, path: uri.uri, progress: true })
    await Filesystem.writeFile({ path: marker, directory: Directory.Cache, data: btoa(url) })
    // readFile defaults to base64; the marker is compared in that same encoding.
    onProgress(100)
    return uri.uri
  } catch (error) {
    await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {})
    throw error
  } finally {
    await listener.remove()
  }
}
