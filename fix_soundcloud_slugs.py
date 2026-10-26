"""Normalize SoundCloud track URL slugs in Music/Albums/Albums song JSON files.

Run this from the Themadhood.github.io repository root:
    python fix_soundcloud_slugs.py

Only updates existing SoundCloud links belonging to the artist account.
It does not rename song JSON files or rewrite unrelated song information.
"""

from pathlib import Path
import json
import re
import unicodedata

ALBUMS_ROOT = Path(__file__).resolve().parent / 'Music' / 'Albums' / 'Albums'
ARTIST_URL = 'https://soundcloud.com/themadhoodpequot/'


def make_slug(name):
    """Convert a song filename to a lowercase, hyphen-separated URL slug."""
    name = unicodedata.normalize('NFKD', name)
    name = ''.join(char for char in name if not unicodedata.combining(char))
    name = name.lower().replace('&', ' and ')
    name = re.sub(r'[^a-z0-9]+', '-', name)
    return name.strip('-')


def update_song(path):
    """Replace only the existing SoundCloud URL value, preserving JSON formatting."""
    original = path.read_text(encoding='utf-8')
    song = json.loads(original)
    existing = song.get('soundcloud')
    if not isinstance(existing, str) or not existing.startswith(ARTIST_URL):
        return 'skipped'

    desired = ARTIST_URL + make_slug(path.stem)
    if existing == desired:
        return 'unchanged'

    # Operate on the serialized string, not a full JSON dump, to keep spacing
    # and formatting of every other field exactly as they were.
    old_literal = json.dumps(existing, ensure_ascii=False)
    new_literal = json.dumps(desired, ensure_ascii=False)
    pattern = r'("soundcloud"\s*:\s*)' + re.escape(old_literal)
    updated, count = re.subn(pattern, lambda m: m.group(1) + new_literal, original, count=1)
    if count != 1:
        raise ValueError(f'Could not safely locate the SoundCloud field in {path}')
    json.loads(updated)  # Check the result before writing it.
    path.write_text(updated, encoding='utf-8')
    print(f'UPDATED: {path.name}: {existing} -> {desired}')
    return 'updated'


def main():
    if not ALBUMS_ROOT.is_dir():
        raise SystemExit(f'Album directory not found: {ALBUMS_ROOT}\nPlace this script in the repository root.')
    counts = dict(updated=0, unchanged=0, skipped=0)
    for path in sorted(ALBUMS_ROOT.glob('*/*.json')):
        if path.name.lower() == 'album.json':
            continue
        status = update_song(path)
        counts[status] += 1
    print('\nComplete: ' + ', '.join(f'{key}: {value}' for key, value in counts.items()))
    print('Note: generated slugs are guesses; confirm unusual titles on SoundCloud.')


if __name__ == '__main__':
    main()
