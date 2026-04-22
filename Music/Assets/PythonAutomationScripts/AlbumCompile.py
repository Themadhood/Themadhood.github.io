# CompileShowcaseJson.py
# Rebuilds Albums_Showcase.json from:
# - Lyrics.json
# - Songs.json
# - Albums.json
# - Featured.json

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

JSON_DIR = Path(__file__).resolve().parent.parent / "JSONs"

LYRICS_JSON_PATH = JSON_DIR / "Lyrics.json"
SONGS_JSON_PATH = JSON_DIR / "Songs.json"
ALBUMS_JSON_PATH = JSON_DIR / "Albums.json"
FEATURED_JSON_PATH = JSON_DIR / "Featured.json"

OUTPUT_JSON_PATH = JSON_DIR / "Albums_Showcase.json"

SHOWCASE_BASE_URL = "http://localhost:8000/GlobalAssets/HTML/Showcase.html"
BRANCH_NAME = "music"
DATA_JSON_NAME = "Albums_Showcase"


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
# GENERAL HELPERS
# ---------------------------------------------------------------------------

def slugify(value: str) -> str:
    value = value.casefold().strip()
    value = value.replace("&", " and ")
    value = value.replace("'", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value)
    return value.strip("-")


def get_records(data: dict[str, Any], key_name: str = "records") -> list[dict[str, Any]]:
    raw_records: Any = data.get(key_name, [])

    if not isinstance(raw_records, list):
        raise ValueError(f"'{key_name}' must be a list.")

    records: list[dict[str, Any]] = []

    for record in raw_records:
        if isinstance(record, dict):
            records.append(record)

    return records


def make_featured_song_href(
    branch_name: str,
    data_json_name: str,
    album_title: str,
    song_title: str,
    showcase_base_url: str,
) -> str:
    album_slug: str = slugify(album_title)
    song_slug: str = slugify(song_title)

    return (
        f"{showcase_base_url}"
        f"?branch={branch_name}"
        f"&data-json={data_json_name}"
        f"&path={album_slug}/{song_slug}"
    )


def normalize_text_field_to_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]

    if value == "" or value is None:
        return []

    return [str(value)]


# ---------------------------------------------------------------------------
# LOOKUP BUILDERS
# ---------------------------------------------------------------------------

def build_lyrics_map(lyrics_data: dict[str, Any]) -> dict[str, list[str]]:
    lyrics_map: dict[str, list[str]] = {}

    for record in get_records(lyrics_data):
        song_title: str = str(record.get("Song", "")).strip()
        lyrics_value: Any = record.get("Lyrics", [])

        if not song_title:
            continue

        if isinstance(lyrics_value, list):
            lyrics_map[song_title] = [str(line) for line in lyrics_value]
        else:
            lyrics_map[song_title] = []

    return lyrics_map


def build_songs_by_album_map(
    songs_data: dict[str, Any],
) -> dict[str, list[dict[str, Any]]]:
    songs_by_album: dict[str, list[dict[str, Any]]] = {}

    for record in get_records(songs_data):
        details: Any = record.get("details", {})
        album_title: str = ""

        if isinstance(details, dict):
            album_title = str(details.get("Album", "")).strip()

        if not album_title:
            continue

        songs_by_album.setdefault(album_title, []).append(record)

    return songs_by_album


def build_song_lookup(
    songs_data: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    song_lookup: dict[str, dict[str, Any]] = {}

    for record in get_records(songs_data):
        title: str = str(record.get("title", "")).strip()
        if title:
            song_lookup[title] = record

    return song_lookup


def build_album_lookup(
    albums_data: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    album_lookup: dict[str, dict[str, Any]] = {}

    for record in get_records(albums_data):
        title: str = str(record.get("title", "")).strip()
        if title:
            album_lookup[title] = record

    return album_lookup


# ---------------------------------------------------------------------------
# SONG / ALBUM BUILDERS
# ---------------------------------------------------------------------------

def sort_song_records(song_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def sort_key(song_record: dict[str, Any]) -> tuple[int, str]:
        details: Any = song_record.get("details", {})
        track_number: int = 999999

        if isinstance(details, dict):
            raw_track: Any = details.get("Track", 999999)

            if isinstance(raw_track, int):
                track_number = raw_track
            else:
                try:
                    track_number = int(raw_track)
                except Exception:
                    track_number = 999999

        song_title: str = str(song_record.get("title", "")).casefold()
        return track_number, song_title

    return sorted(song_records, key=sort_key)


def build_song_dropdown(
    song_record: dict[str, Any],
    album_record: dict[str, Any],
    lyrics_map: dict[str, list[str]],
) -> dict[str, Any]:
    song_title: str = str(song_record.get("title", "")).strip()
    album_image: str = str(album_record.get("image", ""))

    return {
        "title": song_record.get("title", ""),
        "href": song_record.get("href", ""),
        "image": album_image,
        "imageMax": 200,
        "about": song_record.get("about", ""),
        "description": song_record.get("description", ""),
        "details": song_record.get("details", {}),
        "dropdowns": [
            {
                "title": "Lyrics",
                "": lyrics_map.get(song_title, []),
            }
        ],
    }


def build_album_section(
    album_record: dict[str, Any],
    songs_by_album: dict[str, list[dict[str, Any]]],
    lyrics_map: dict[str, list[str]],
) -> dict[str, Any]:
    album_title: str = str(album_record.get("title", "")).strip()
    album_song_records: list[dict[str, Any]] = sort_song_records(
        songs_by_album.get(album_title, [])
    )

    song_dropdowns: list[dict[str, Any]] = [
        build_song_dropdown(
            song_record=song_record,
            album_record=album_record,
            lyrics_map=lyrics_map,
        )
        for song_record in album_song_records
    ]

    return {
        "title": album_record.get("title", ""),
        "href": album_record.get("href", ""),
        "about": album_record.get("about", ""),
        "body": album_record.get("body", []),
        "image": album_record.get("image", ""),
        "imageMax": album_record.get("imageMax", 320),
        "details": album_record.get("details", {}),
        "dropdowns": song_dropdowns,
    }


# ---------------------------------------------------------------------------
# FEATURED BUILDERS
# ---------------------------------------------------------------------------

def build_featured_items(
    featured_data: dict[str, Any],
    song_lookup: dict[str, dict[str, Any]],
    album_lookup: dict[str, dict[str, Any]],
    showcase_base_url: str,
    branch_name: str,
    data_json_name: str,
) -> list[dict[str, Any]]:
    featured_song_names: Any = featured_data.get("Songs", [])
    featured_items: list[dict[str, Any]] = []

    if not isinstance(featured_song_names, list):
        return featured_items

    for song_name_value in featured_song_names:
        song_name: str = str(song_name_value).strip()
        if not song_name:
            continue

        song_record: dict[str, Any] | None = song_lookup.get(song_name)
        if song_record is None:
            print(f"Warning: featured song '{song_name}' was not found in Songs.json.")
            continue

        details: Any = song_record.get("details", {})
        album_title: str = ""

        if isinstance(details, dict):
            album_title = str(details.get("Album", "")).strip()

        album_record: dict[str, Any] | None = album_lookup.get(album_title)
        if album_record is None:
            print(
                f"Warning: featured song '{song_name}' references missing album "
                f"'{album_title}'."
            )
            continue

        song_details: dict[str, Any] = {}
        if isinstance(song_record.get("details", {}), dict):
            song_details = song_record.get("details", {})

        featured_items.append(
            {
                "title": song_record.get("title", ""),
                "href": make_featured_song_href(
                    branch_name=branch_name,
                    data_json_name=data_json_name,
                    album_title=album_title,
                    song_title=song_name,
                    showcase_base_url=showcase_base_url,
                ),
                "image": album_record.get("image", ""),
                "imageMax": 320,
                "description": normalize_text_field_to_list(
                    song_record.get("description", [])
                ),
                "about": normalize_text_field_to_list(
                    song_record.get("about", [])
                ),
                "details": {
                    "Type": "Song",
                    **song_details,
                },
            }
        )

    return featured_items


def build_featured_section(
    featured_data: dict[str, Any],
    song_lookup: dict[str, dict[str, Any]],
    album_lookup: dict[str, dict[str, Any]],
    showcase_base_url: str,
    branch_name: str,
    data_json_name: str,
) -> dict[str, Any]:
    return {
        "title": str(featured_data.get("title", "Featured Collection")),
        "": str(featured_data.get("description", "")),
        "items": build_featured_items(
            featured_data=featured_data,
            song_lookup=song_lookup,
            album_lookup=album_lookup,
            showcase_base_url=showcase_base_url,
            branch_name=branch_name,
            data_json_name=data_json_name,
        ),
    }


# ---------------------------------------------------------------------------
# FINAL SHOWCASE BUILDER
# ---------------------------------------------------------------------------

def build_showcase_json(
    lyrics_data: dict[str, Any],
    songs_data: dict[str, Any],
    albums_data: dict[str, Any],
    featured_data: dict[str, Any],
    showcase_base_url: str,
    branch_name: str,
    data_json_name: str,
) -> dict[str, Any]:
    lyrics_map: dict[str, list[str]] = build_lyrics_map(lyrics_data)
    songs_by_album: dict[str, list[dict[str, Any]]] = build_songs_by_album_map(songs_data)
    song_lookup: dict[str, dict[str, Any]] = build_song_lookup(songs_data)
    album_lookup: dict[str, dict[str, Any]] = build_album_lookup(albums_data)

    featured_section: dict[str, Any] = build_featured_section(
        featured_data=featured_data,
        song_lookup=song_lookup,
        album_lookup=album_lookup,
        showcase_base_url=showcase_base_url,
        branch_name=branch_name,
        data_json_name=data_json_name,
    )

    album_sections: list[dict[str, Any]] = []

    for album_record in get_records(albums_data):
        album_sections.append(
            build_album_section(
                album_record=album_record,
                songs_by_album=songs_by_album,
                lyrics_map=lyrics_map,
            )
        )

    return {
        "sections": [featured_section, *album_sections]
    }


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> None:
    print("Compile Showcase JSON\n")

    lyrics_data: dict[str, Any] = load_json_file(LYRICS_JSON_PATH)
    songs_data: dict[str, Any] = load_json_file(SONGS_JSON_PATH)
    albums_data: dict[str, Any] = load_json_file(ALBUMS_JSON_PATH)
    featured_data: dict[str, Any] = load_json_file(FEATURED_JSON_PATH)

    showcase_json: dict[str, Any] = build_showcase_json(
        lyrics_data=lyrics_data,
        songs_data=songs_data,
        albums_data=albums_data,
        featured_data=featured_data,
        showcase_base_url=SHOWCASE_BASE_URL,
        branch_name=BRANCH_NAME,
        data_json_name=DATA_JSON_NAME,
    )

    write_json_file(OUTPUT_JSON_PATH, showcase_json)

    print(f"Created: {OUTPUT_JSON_PATH}")


if __name__ == "__main__":
    main()
