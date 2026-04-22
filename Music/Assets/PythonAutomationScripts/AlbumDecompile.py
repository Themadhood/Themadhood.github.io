# SplitShowcaseJson.py
# Splits Albums_Showcase.json into:
# - Lyrics.json
# - Songs.json
# - Albums.json
# - Featured.json

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

JSON_DIR = Path(__file__).resolve().parent.parent / "JSONs"

SOURCE_JSON_PATH = JSON_DIR / "Albums_Showcase.json"

LYRICS_JSON_PATH = JSON_DIR / "Lyrics.json"
SONGS_JSON_PATH = JSON_DIR / "Songs.json"
ALBUMS_JSON_PATH = JSON_DIR / "Albums.json"
FEATURED_JSON_PATH = JSON_DIR / "Featured.json"


# ---------------------------------------------------------------------------
# JSON HELPERS
# ---------------------------------------------------------------------------

def load_json_file(json_file_path: Path) -> dict[str, Any]:
    return json.loads(json_file_path.read_text(encoding="utf-8"))


def write_json_file(json_file_path: Path, data: dict[str, Any]) -> None:
    json_file_path.parent.mkdir(parents=True, exist_ok=True)
    json_file_path.write_text(
        json.dumps(data, indent=4, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# SHOWCASE PARSING HELPERS
# ---------------------------------------------------------------------------

def get_sections(showcase_data: dict[str, Any]) -> list[dict[str, Any]]:
    sections: Any = showcase_data.get("sections", [])

    if not isinstance(sections, list):
        raise ValueError("'sections' must be a list.")

    valid_sections: list[dict[str, Any]] = []

    for section in sections:
        if isinstance(section, dict):
            valid_sections.append(section)

    return valid_sections


def find_featured_section(
    sections: list[dict[str, Any]],
) -> dict[str, Any] | None:
    for section in sections:
        if str(section.get("title", "")).strip() == "Featured Collection":
            return section

    return None


def find_album_sections(
    sections: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    album_sections: list[dict[str, Any]] = []

    for section in sections:
        details: Any = section.get("details", {})

        if not isinstance(details, dict):
            continue

        if str(details.get("Type", "")).strip() == "Album":
            album_sections.append(section)

    return album_sections


def extract_featured_data(
    featured_section: dict[str, Any] | None,
) -> dict[str, Any]:
    if featured_section is None:
        return {
            "title": "Featured Collection",
            "description": "",
            "Songs": [],
        }

    featured_items: Any = featured_section.get("items", [])
    song_names: list[str] = []

    if isinstance(featured_items, list):
        for item in featured_items:
            if not isinstance(item, dict):
                continue

            song_title: str = str(item.get("title", "")).strip()
            if song_title:
                song_names.append(song_title)

    return {
        "title": str(featured_section.get("title", "Featured Collection")),
        "description": str(featured_section.get("", "")),
        "Songs": song_names,
    }


def extract_album_record(album_section: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": album_section.get("title", ""),
        "href": album_section.get("href", ""),
        "about": album_section.get("about", ""),
        "body": album_section.get("body", []),
        "image": album_section.get("image", ""),
        "imageMax": album_section.get("imageMax", 320),
        "details": album_section.get("details", {}),
    }


def extract_lyrics_from_song(song_dropdowns: Any) -> list[str]:
    if not isinstance(song_dropdowns, list):
        return []

    for dropdown in song_dropdowns:
        if not isinstance(dropdown, dict):
            continue

        if str(dropdown.get("title", "")).strip() != "Lyrics":
            continue

        lyrics_value: Any = dropdown.get("", [])
        if isinstance(lyrics_value, list):
            return [str(line) for line in lyrics_value]

    return []


def extract_song_record(
    album_title: str,
    song_item: dict[str, Any],
) -> dict[str, Any]:
    existing_details: Any = song_item.get("details", {})

    if not isinstance(existing_details, dict):
        existing_details = {}

    return {
        "title": song_item.get("title", ""),
        "href": song_item.get("href", ""),
        "about": song_item.get("about", ""),
        "description": song_item.get("description", ""),
        "details": {
            **existing_details,
            "Album": album_title,
        },
    }


def extract_song_and_lyrics_records(
    album_sections: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    song_records: list[dict[str, Any]] = []
    lyric_records: list[dict[str, Any]] = []

    for album_section in album_sections:
        album_title: str = str(album_section.get("title", "")).strip()
        dropdowns: Any = album_section.get("dropdowns", [])

        if not isinstance(dropdowns, list):
            continue

        for song_item in dropdowns:
            if not isinstance(song_item, dict):
                continue

            song_title: str = str(song_item.get("title", "")).strip()
            if not song_title:
                continue

            song_records.append(
                extract_song_record(
                    album_title=album_title,
                    song_item=song_item,
                )
            )

            lyric_records.append(
                {
                    "Song": song_title,
                    "Lyrics": extract_lyrics_from_song(
                        song_item.get("dropdowns", [])
                    ),
                }
            )

    return song_records, lyric_records


def build_split_files(
    showcase_data: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    sections: list[dict[str, Any]] = get_sections(showcase_data)

    featured_section: dict[str, Any] | None = find_featured_section(sections)
    album_sections: list[dict[str, Any]] = find_album_sections(sections)

    featured_data: dict[str, Any] = extract_featured_data(featured_section)

    album_records: list[dict[str, Any]] = [
        extract_album_record(album_section)
        for album_section in album_sections
    ]

    song_records, lyric_records = extract_song_and_lyrics_records(album_sections)

    lyrics_json: dict[str, Any] = {"records": lyric_records}
    songs_json: dict[str, Any] = {"records": song_records}
    albums_json: dict[str, Any] = {"records": album_records}
    featured_json: dict[str, Any] = featured_data

    return lyrics_json, songs_json, albums_json, featured_json


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> None:
    print("Split Showcase JSON\n")

    showcase_data: dict[str, Any] = load_json_file(SOURCE_JSON_PATH)

    lyrics_json, songs_json, albums_json, featured_json = build_split_files(
        showcase_data
    )

    write_json_file(LYRICS_JSON_PATH, lyrics_json)
    write_json_file(SONGS_JSON_PATH, songs_json)
    write_json_file(ALBUMS_JSON_PATH, albums_json)
    write_json_file(FEATURED_JSON_PATH, featured_json)

    print("Created:")
    print(f"    {LYRICS_JSON_PATH}")
    print(f"    {SONGS_JSON_PATH}")
    print(f"    {ALBUMS_JSON_PATH}")
    print(f"    {FEATURED_JSON_PATH}")


if __name__ == "__main__":
    main()
