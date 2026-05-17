import re

with open('hooks/use-updater.ts', 'r') as f:
    content = f.read()

# Reemplazar la asignación de currentVersion nativa
old_code = """      if (Capacitor.isNativePlatform()) {
        const appInfo = await App.getInfo();
        setCurrentVersion(appInfo.version);
      }

      const response = await fetch("https://api.github.com/repos/zeta-develop/lotochoco/releases/latest");
      const data: Release = await response.json();

      const latestTag = data.tag_name.replace('v', '');
      setLatestVersion(latestTag);

      // Simple version comparison (assumes format like 1.1.3 or 1.1.3-43)
      if (latestTag !== currentVersion) {"""

new_code = """      let currentAppVer = packageJson.version;
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
      if (latestTag !== currentAppVer) {"""

content = content.replace(old_code, new_code)

with open('hooks/use-updater.ts', 'w') as f:
    f.write(content)
