#reads all link files and builds a sections json

from __future__ import annotations

import json
from pathlib import Path


def get_directory() -> Path:
    while True:
        raw_path = input("Enter the parent directory path: ").strip().strip('"')
        path = Path(raw_path)

        if path.exists() and path.is_dir():
            return path

        print("That is not a valid directory. Try again.\n")


def read_links_json(file_path: Path) -> dict | None:
    try:
        with file_path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (json.JSONDecodeError, OSError) as error:
        print(f"Skipping {file_path}: {error}")
        return None


def extract_section_titles(data: dict) -> list[str]:
    sections = data.get("sections", [])
    titles: list[str] = []

    if not isinstance(sections, list):
        return titles

    for section in sections:
        if not isinstance(section, dict):
            continue

        title = section.get("title")
        if isinstance(title, str) and title.strip():
            titles.append(title.strip())

    return titles


def build_branch_list(parent_dir: Path) -> list[dict]:
    results: list[dict] = []

    for item in sorted(parent_dir.iterdir()):
        if not item.is_dir():
            continue

        links_path = item / "Assets/JSONs/Links.json"
        if not links_path.exists():
            continue

        data = read_links_json(links_path)
        if not isinstance(data, dict):
            continue

        section_titles = extract_section_titles(data)

        results.append({
            "branch": item.name.lower(),
            "sections": section_titles
        })

    return results


def save_output(data: list[dict], parent_dir: Path) -> Path:
    output_name = "branch_link_sections"

    output_path = parent_dir / f"{output_name}.json"

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

    return output_path


def main() -> None:
    parent_dir = get_directory()
    output_data = build_branch_list(parent_dir)
    output_path = save_output(output_data, parent_dir)

    print(f"\nDone. Output saved to:\n{output_path}")


if __name__ == "__main__":
    main()
