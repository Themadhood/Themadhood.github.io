"""Add assumed SoundCloud links to existing song JSON files.

Run from anywhere inside your Themadhood.github.io checkout:
    python add_soundcloud_urls.py /path/to/Themadhood.github.io

Only song JSON files in Music/Albums/Albums are changed. Album.json is skipped.
Existing soundcloud values are never overwritten. The script preserves the
original text formatting by inserting one JSON property, rather than dumping
and reformatting the entire document.
"""

import argparse
import json
import re
from pathlib import Path

SOUNDCLOUD_BASE = "https://soundcloud.com/themadhoodpequot/"
SONG_DIRECTORY = Path("Music/Albums/Albums")


def add_soundcloud(song_file: Path) -> str:
    """Insert a SoundCloud URL based on the JSON filename, if one is absent."""
    original = song_file.read_text(encoding="utf-8")
    song = json.loads(original)
    if not isinstance(song, dict):
        return "skipped (not a song object)"
    if "soundcloud" in song:
        return "skipped (already contains soundcloud)"

    # The file's stem is the proposed track slug, even if it differs from id.
    track_url = SOUNDCLOUD_BASE + song_file.stem
    line_ending = "\r\n" if "\r\n" in original else "\n"
    # Add the new property immediately after the existing href when present.
    # This keeps the file's original indentation, ordering and all other data.
    match = re.search(r'(?m)^(?P<indent>[ \t]*)"href"[ \t]*:[ \t]*(?:"(?:\\.|[^"\\])*"|null)[ \t]*,?[ \t]*(?:\r?\n)', original)
    if match:
        indent = match.group("indent")
        existing_line = match.group(0)
        if not existing_line.rstrip().endswith(","):
            existing_line = existing_line.rstrip("\r\n") + "," + line_ending
        addition = indent + '"soundcloud": ' + json.dumps(track_url) + "," + line_ending
        updated = original[:match.start()] + existing_line + addition + original[match.end():]
    else:
        # Fallback: insert immediately after the opening brace, preserving
        # the rest of the JSON byte-for-byte.
        match = re.search(r'\{\s*', original)
        if not match or not song:
            return "skipped (unrecognized or empty JSON)"
        indent_match = re.search(r'(?m)^([ \t]+)"', original)
        indent = indent_match.group(1) if indent_match else "    "
        addition = line_ending + indent + '"soundcloud": ' + json.dumps(track_url) + ","
        updated = original[:match.start()+1] + addition + original[match.end()-len(match.group(0))+1:]

    # Never write an invalid JSON file.
    validated = json.loads(updated)
    assert validated["soundcloud"] == track_url
    for key, value in song.items():
        assert validated[key] == value, f"Existing data changed: {key}"
    song_file.write_text(updated, encoding="utf-8", newline="")
    return "added"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", nargs="?", default=".", help="Path to Themadhood.github.io repository")
    args = parser.parse_args()
    directory = Path(args.repo).resolve() / SONG_DIRECTORY
    if not directory.is_dir():
        parser.error(f"Song directory not found: {directory}")

    counts = {"added": 0, "skipped": 0, "failed": 0}
    for song_file in sorted(directory.rglob("*.json")):
        if song_file.name.lower() == "album.json":
            continue
        try:
            result = add_soundcloud(song_file)
            counts["added" if result == "added" else "skipped"] += 1
            print(f"{result}: {song_file.relative_to(directory)}")
        except (OSError, ValueError, AssertionError) as error:
            counts["failed"] += 1
            print(f"FAILED: {song_file}: {error}")
    print(f"\nAdded: {counts['added']} | Skipped: {counts['skipped']} | Failed: {counts['failed']}")


if __name__ == "__main__":
    main()
