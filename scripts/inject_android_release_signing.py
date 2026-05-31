from pathlib import Path
import json
import os
import re
import sys


def main() -> int:
    gradle_file = Path('android/app/build.gradle')
    if not gradle_file.exists():
        print('android/app/build.gradle not found', file=sys.stderr)
        return 1

    package_json = Path('package.json')
    app_version = os.environ.get('APP_VERSION')
    if not app_version and package_json.exists():
        app_version = json.loads(package_json.read_text()).get('version')

    app_version_code = os.environ.get('APP_VERSION_CODE')
    if not app_version_code:
        app_version_code = '1'

    text = gradle_file.read_text()

    if 'releaseSigningConfigInjected' not in text:
        marker = 'android {'
        insertion = '''android {
    signingConfigs {
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }
'''
        if marker not in text:
            print('Could not find android block in android/app/build.gradle', file=sys.stderr)
            return 1

        text = text.replace(marker, insertion, 1)
        text = text.replace(
            'release {\n            minifyEnabled false',
            'release {\n            signingConfig signingConfigs.release\n            minifyEnabled false',
            1,
        )
        text += '\n// releaseSigningConfigInjected\n'

    if app_version:
        text = re.sub(r'(\s*versionCode\s+)\d+', rf'\g<1>{app_version_code}', text, count=1)
        text = re.sub(r'(\s*versionName\s+")[^"]*(")', rf'\g<1>{app_version}\g<2>', text, count=1)
        if 'versionCode' not in text or 'versionName' not in text:
            text = text.replace(
                '    defaultConfig {\n',
                f'    defaultConfig {{\n        versionCode {app_version_code}\n        versionName "{app_version}"\n',
                1,
            )

    gradle_file.write_text(text)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())


if __name__ == '__main__':
    raise SystemExit(main())
