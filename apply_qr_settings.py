"""Add an editable QR background color to every branch Settings.json.

Run from the root of Themadhood.github.io:
    python apply_qr_settings.py

Existing settings and formatting are preserved. No external dependencies.
"""
from pathlib import Path
import json
import re

BRANCHES = (
    'Applications', 'Apps', 'Automations', 'Codes', 'Coding-Foundations',
    'Databases', 'Development-Tools', 'Executables', 'Games', 'Goods',
    'Media', 'Music', 'PI-Automations', 'PI-Relays', 'PI-Solutions',
    'PI-Utilities', 'Pequot', 'Photos', 'Scripts', 'Systems', 'Videos',
)


def update_settings(path: Path) -> bool:
    source = path.read_text(encoding='utf-8')
    settings = json.loads(source)
    colors = settings['brand']['colors']
    if 'qrBackground' in colors:
        print(f'Already configured: {path}')
        return False

    # Insert next to accent so the new option is easy to find.
    pattern = r'(?m)^(\s*)"accent"\s*:\s*"[^"]*",\s*$'
    match = re.search(pattern, source)
    if match is None:
        raise ValueError(f'Could not locate brand.colors.accent in {path}')
    indent = match.group(1)
    insertion = f'{indent}"qrBackground": "#ffffff",\n'
    revised = source[:match.end()] + '\n' + insertion.rstrip('\n') + source[match.end():]
    parsed = json.loads(revised)
    assert parsed['brand']['colors']['qrBackground'] == '#ffffff'
    path.write_text(revised, encoding='utf-8')
    print(f'Updated: {path}')
    return True


def main() -> None:
    root = Path(__file__).resolve().parent
    if not (root / 'GlobalAssets').is_dir():
        raise SystemExit('Place this script in the repository root before running it.')
    count = 0
    for branch in BRANCHES:
        path = root / branch / 'Assets' / 'JSONs' / 'Settings.json'
        if not path.is_file():
            raise SystemExit(f'Missing Settings.json: {path}')
        count += update_settings(path)
    print(f'Done. Updated {count} Settings.json files.')


if __name__ == '__main__':
    main()
