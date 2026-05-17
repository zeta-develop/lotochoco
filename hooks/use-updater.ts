"use client";

import { useState, useEffect } from "react";
import { App } from "@capacitor/app";
import { Dialog } from "@capacitor/dialog";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { Capacitor } from "@capacitor/core";
import packageJson from "../package.json";

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
      if (Capacitor.isNativePlatform()) {
        const appInfo = await App.getInfo();
        setCurrentVersion(appInfo.version);
      }

      const response = await fetch("https://api.github.com/repos/zeta-develop/lotochoco/releases/latest");
      const data: Release = await response.json();

      const latestTag = data.tag_name.replace('v', '');
      setLatestVersion(latestTag);

      // Simple version comparison (assumes format like 1.1.3 or 1.1.3-43)
      if (latestTag !== currentVersion) {
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
        // Option A: Use native browser to handle download and install automatically
        window.open(apkAsset.browser_download_url, '_system');
      }

    } catch (error) {
      console.error("Error updating app:", error);
      await Dialog.alert({
        title: 'Error',
        message: 'No se pudo iniciar la actualización.'
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
