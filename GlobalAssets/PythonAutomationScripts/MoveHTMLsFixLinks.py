from __future__ import annotations

import re
import shutil
from pathlib import Path


def normalize_web_path(path_text: str) -> str:
    # Convert Windows slashes to web slashes
    return path_text.replace("\\", "/")


def build_new_web_path(main_dir: Path, moved_to: Path) -> str:
    # Build a web-style absolute path relative to the main directory
    relative_path = moved_to.relative_to(main_dir)
    return "/" + normalize_web_path(str(relative_path))


def is_inside_global_assets(file_path: Path, global_assets_dir: Path) -> bool:
    try:
        file_path.relative_to(global_assets_dir)
        return True
    except ValueError:
        return False


def update_links_in_text(text: str, target_filename: str, new_web_path: str) -> tuple[str, int]:
    # This finds URL-ish strings in HTML/JSON that end with the target filename,
    # optionally followed by query/hash data, and replaces only the path portion.
    #
    # Examples matched:
    # "/BizCard.html?branch=music"
    # "BizCard.html?branch=music"
    # "./BizCard.html"
    # "../pages/BizCard.html#top"
    #
    # It will NOT re-replace links already using the final path.

    escaped_filename = re.escape(target_filename)

    pattern = re.compile(
        rf'''
        (?P<full>
            (?P<path>
                (?!{re.escape(new_web_path)})
                (?:
                    /|
                    \./|
                    \.\./|
                    [A-Za-z0-9_\-./]+/
                )?
                {escaped_filename}
            )
            (?P<suffix>
                (?:\?[^"'`\s<>]*)?
                (?:\#[^"'`\s<>]*)?
            )
        )
        ''',
        re.VERBOSE,
    )

    replacements = 0

    def replacer(match: re.Match[str]) -> str:
        nonlocal replacements

        old_path = match.group("path")
        suffix = match.group("suffix") or ""

        # Skip if the matched path is already correct
        if normalize_web_path(old_path) == new_web_path:
            return match.group("full")

        replacements += 1
        return f"{new_web_path}{suffix}"

    new_text = pattern.sub(replacer, text)
    return new_text, replacements


def process_file(file_path: Path, target_filename: str, new_web_path: str) -> int:
    try:
        original_text = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        print(f"Skipped (not UTF-8): {file_path}")
        return 0
    except Exception as exc:
        print(f"Failed to read {file_path}: {exc}")
        return 0

    updated_text, replacements = update_links_in_text(original_text, target_filename, new_web_path)

    if replacements > 0 and updated_text != original_text:
        try:
            file_path.write_text(updated_text, encoding="utf-8")
            print(f"Updated {file_path} ({replacements} replacement(s))")
        except Exception as exc:
            print(f"Failed to write {file_path}: {exc}")
            return 0

    return replacements


def main() -> None:
    print("Move HTML file and update links")
    print("-" * 40)

    main_dir = Path(input("Main directory: ").strip().strip('"')).resolve()
    source_file = Path(input("HTML file to move: ").strip().strip('"')).resolve()
    move_to_dir = Path(input("Destination folder: ").strip().strip('"')).resolve()

    if not main_dir.exists() or not main_dir.is_dir():
        print("Main directory does not exist or is not a folder.")
        return

    if not source_file.exists() or not source_file.is_file():
        print("Source file does not exist or is not a file.")
        return

    if source_file.suffix.lower() != ".html":
        print("Source file must be a .html file.")
        return

    try:
        source_file.relative_to(main_dir)
    except ValueError:
        print("The source file must be inside the main directory.")
        return

    move_to_dir.mkdir(parents=True, exist_ok=True)
    moved_file = move_to_dir / source_file.name

    if moved_file.exists():
        print(f"Destination file already exists: {moved_file}")
        return

    global_assets_dir = (main_dir / "GlobalAssets").resolve()

    try:
        moved_file.relative_to(main_dir)
    except ValueError:
        print("The destination folder must be inside the main directory.")
        return

    print()
    print(f"Source file:      {source_file}")
    print(f"Destination file: {moved_file}")

    confirm = input("Proceed with move and link updates?? [y/N]: ").strip().lower()
    if confirm != "y":
        print("Cancelled.")
        return

    try:
        shutil.move(str(source_file), str(moved_file))
    except Exception as exc:
        print(f"Failed to move file: {exc}")
        return

    new_web_path = build_new_web_path(main_dir, moved_file)
    target_filename = source_file.name

    print()
    print(f"Moved to: {moved_file}")
    print(f"New web path: {new_web_path}")
    print()

    total_files_updated = 0
    total_replacements = 0

    for file_path in main_dir.rglob("*"):
        if not file_path.is_file():
            continue

        if is_inside_global_assets(file_path.resolve(), global_assets_dir):
            continue

        if file_path.suffix.lower() not in {".html", ".json"}:
            continue

        replacements = process_file(file_path, target_filename, new_web_path)
        if replacements > 0:
            total_files_updated += 1
            total_replacements += replacements

    print()
    print("Done.")
    print(f"Files updated: {total_files_updated}")
    print(f"Total replacements: {total_replacements}")


if __name__ == "__main__":
    main()