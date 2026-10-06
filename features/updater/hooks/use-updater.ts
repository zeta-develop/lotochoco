"use client";

import { useState, useEffect } from "react";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { downloadApk } from '../download';
import { FileOpener } from "@capacitor-community/file-opener";
import { Capacitor } from "@capacitor/core";
import { toast } from '@/components/ui/use-toast';
import packageJson from "../../../package.json";
import { isNewerRelease } from '../version';
import { fetchLatestApkRelease } from '../releases';

export function useUpdater() {
  const [currentVersion, setCurrentVersion] = useState(packageJson.version);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const installedVersion = async () => {
    if (!Capacitor.isNativePlatform()) return packageJson.version;
    const info = await App.getInfo();
    return info.build ? `${info.version}-${info.build}` : info.version;
  };

  const checkUpdate = async () => {
    try {
      const current = await installedVersion();
      setCurrentVersion(current);
      const release = await fetchLatestApkRelease();
      const latest = release.tag_name.replace(/^v/, '');
      setLatestVersion(latest);
      setIsUpdateAvailable(isNewerRelease(latest, current));
    } catch (error) {
      setLatestVersion(null);
      setIsUpdateAvailable(false);
      console.error('Error checking for updates:', error);
    }
  };
  useEffect(() => {
    void checkUpdate();
    const checkWhenVisible = () => { if (document.visibilityState === 'visible') void checkUpdate(); };
    document.addEventListener('visibilitychange', checkWhenVisible);
    const listener = Capacitor.isNativePlatform() ? App.addListener('appStateChange', state => { if (state.isActive) void checkUpdate(); }) : null;
    return () => {
      document.removeEventListener('visibilitychange', checkWhenVisible);
      if (listener) void listener.then(handle => handle.remove());
    };
  }, []);

  const downloadAndInstallUpdate = async () => {
    if (!latestVersion || isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      const release = await fetchLatestApkRelease();
      const latest = release.tag_name.replace(/^v/, '');
      if (!isNewerRelease(latest, await installedVersion())) {
        setIsUpdateAvailable(false);
        return;
      }
      const asset = release.assets.find(a => a.name.endsWith('.apk'));
      if (!asset) throw new Error('No hay APK disponible en esta actualización.');
      if (!Capacitor.isNativePlatform()) {
        window.location.href = asset.browser_download_url;
        return;
      }
      const { value } = await Dialog.confirm({
        title: 'Actualización disponible',
        message: `La versión ${latest} está disponible. ¿Deseas descargarla e instalarla ahora?`
      });
      if (!value) return;
      const path = `lotochoco_v${latest}.apk`;
      toast({ title: 'Preparando actualización...' });
      const apkUri = await downloadApk(asset.browser_download_url, path, setDownloadProgress);
      // Installation errors must not trigger another APK download.
      try {
        await FileOpener.open({ filePath: apkUri, contentType: 'application/vnd.android.package-archive' });
      } catch {
        throw new Error('El APK se descargó. Habilita la instalación de aplicaciones desde esta fuente en Ajustes y vuelve a intentarlo.');
      }
    } catch (error) {
      await Dialog.alert({ title: 'Error', message: error instanceof Error ? error.message : 'No se pudo iniciar la actualización.' });
    } finally {
      setIsDownloading(false);
    }
  };
  return { currentVersion, latestVersion, isUpdateAvailable, isDownloading, downloadProgress, checkUpdate, downloadAndInstallUpdate };
}
