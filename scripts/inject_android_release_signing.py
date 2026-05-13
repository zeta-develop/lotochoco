from pathlib import Path
import sys


def main() -> int:
    gradle_file = Path('android/app/build.gradle')
    if not gradle_file.exists():
        print('android/app/build.gradle not found', file=sys.stderr)
        return 1

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

    gradle_file.write_text(text)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
