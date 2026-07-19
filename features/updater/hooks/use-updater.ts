"use client";

import { useState, useEffect } from "react";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Http } from "@capacitor-community/http";
import { FileOpener } from "@capacitor-community/file-opener";
import { Capacitor } from "@capacitor/core";
import { toast } from '@/components/ui/use-toast';
import packageJson from "../../../package.json";

interface Release {
  tag_name: string;
  assets: { name: string; browser_download_url: string }[];
}

export function useUpdater() {
  const [currentVersion, setCurrentVersion] = useState(packageJson.version);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    checkUpdate();
  }, []);

  const checkUpdate = async () => {
    try {
      let currentAppVer = packageJson.version;
      if (Capacitor.isNativePlatform()) {
        const appInfo = await App.getInfo();
        // In Android, appInfo.build contains the versionCode (e.g. 44)
        currentAppVer = appInfo.build ? `${appInfo.version}-${appInfo.build}` : appInfo.version;
        setCurrentVersion(currentAppVer);
      }

      const response = await fetch("https://api.github.com/repos/zeta-develop/lotochoco/releases/latest");
      const data: Release = await response.json();

      const latestTag = data.tag_name.replace('v', '');
      setLatestVersion(latestTag);

      // Simple version comparison
      if (latestTag !== currentAppVer) {
        setIsUpdateAvailable(true);
        // We could also show a dialog right here
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    }
  };

  const downloadAndInstallUpdate = async () => {
    if (!latestVersion) return;

    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const response = await fetch("https://api.github.com/repos/zeta-develop/lotochoco/releases/latest");
      const release: Release = await response.json();

      const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
      if (!apkAsset) {
        throw new Error("No APK found in the latest release");
      }

      // We will fallback to browser download if not native, but shouldn't happen often
      if (!Capacitor.isNativePlatform()) {
        window.location.href = apkAsset.browser_download_url;
        setIsDownloading(false);
        return;
      }

      // Native download
      const fileName = `lotochoco-${latestVersion}.apk`;

      // We will use native fetch or basic XHR to get progress, but Capacitor HTTP plugin is better if available
      // However, to keep it simple, we can download via a hidden link or FileSystem
      // Actually, standard window fetch doesn't give progress easily without streams.
      // Let's use simple window location or Capacitor HTTP if we want.
      // Actually, opening the URL in the system browser to download and install is the most reliable way
      // without extra background permissions!

      const { value } = await Dialog.confirm({
        title: 'Actualización Disponible',
        message: `La versión ${latestVersion} está disponible. ¿Deseas descargarla e instalarla ahora?`
      });

      if (value) {
        toast({ title: 'Descargando actualización...' });

        const fileName = `lotochoco_v${latestVersion}.apk`;
        const progressListener = await Http.addListener('progress', (progress) => {
          if (progress.type !== 'DOWNLOAD') return;
          if (!progress.contentLength) return;

          const percent = Math.max(0, Math.min(100, Math.round((progress.bytes / progress.contentLength) * 100)));
          setDownloadProgress(percent);
        });

        const installFromCache = async (path: string) => {
          try {
            await FileOpener.open({
              filePath: path,
              contentType: 'application/vnd.android.package-archive'
            });
          } catch (installError) {
            console.error('Error al abrir el instalador:', installError);
            throw new Error('El APK se descargó, pero no se pudo abrir el instalador.');
          }
        };

        const downloadWithHttpFile = async () => {
          const downloadResult = await Http.downloadFile({
            url: apkAsset.browser_download_url,
            filePath: fileName,
            fileDirectory: Directory.Cache,
            progress: true
          });

          if (!downloadResult.path) {
            throw new Error('No se recibió la ruta del archivo descargado.');
          }

          return downloadResult.path;
        };

        const downloadWithBinaryFallback = async () => {
          const response = await Http.request({
            url: apkAsset.browser_download_url,
            method: 'GET',
            responseType: 'arraybuffer'
          });

          const base64Data = String(response.data || '');
          if (!base64Data) {
            throw new Error('La descarga binaria devolvió un archivo vacío.');
          }

          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });

          const uri = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
          });

          return uri.uri;
        };

        try {
          const downloadedPath = await downloadWithHttpFile();
          setDownloadProgress(100);
          console.log('APK descargado en:', downloadedPath);
          toast({ title: 'Descarga completada. Iniciando instalación...' });
          await installFromCache(downloadedPath);
        } catch (downloadError) {
          console.error('Error en descarga nativa, usando fallback binario:', downloadError);
          setDownloadProgress(0);
          toast({ title: 'Reintentando descarga...' });

          const fallbackPath = await downloadWithBinaryFallback();
          setDownloadProgress(100);
          console.log('APK descargado por fallback en:', fallbackPath);
          toast({ title: 'Descarga completada. Iniciando instalación...' });
          await installFromCache(fallbackPath);
        } finally {
          await progressListener.remove();
        }
      }

    } catch (error) {
      console.error("Error updating app:", error);
      await Dialog.alert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'No se pudo iniciar la actualización.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    currentVersion,
    latestVersion,
    isUpdateAvailable,
    isDownloading,
    downloadProgress,
    checkUpdate,
    downloadAndInstallUpdate
  };
}
