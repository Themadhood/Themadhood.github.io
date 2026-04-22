from __future__ import annotations

import re
from pathlib import Path


def normalize_web_path(path_text: str) -> str:
    return path_text.replace("\\", "/")


def is_inside_global_assets(file_path: Path, global_assets_dir: Path) -> bool:
    try:
        file_path.relative_to(global_assets_dir)
        return True
    except ValueError:
        return False


def update_links(text: str, old_name: str, new_name: str) -> tuple[str, int]:
    escaped_old = re.escape(old_name)

    pattern = re.compile(
        rf'''
        (?P<full>
            (?P<path>
                (?:/|\./|\.\./|[A-Za-z0-9_\-./]+/)?
                {escaped_old}
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

        # Replace just the filename part
        new_path = re.sub(re.escape(old_name) + r"$", new_name, old_path)

        replacements += 1
        return f"{new_path}{suffix}"

    new_text = pattern.sub(replacer, text)
    return new_text, replacements


def process_file(file_path: Path, old_name: str, new_name: str) -> int:
    try:
        original = file_path.read_text(encoding="utf-8")
    except:
        return 0

    updated, count = update_links(original, old_name, new_name)

    if count > 0 and updated != original:
        file_path.write_text(updated, encoding="utf-8")
        print(f"Updated {file_path} ({count})")

    return count


def main():
    print("Rename HTML file and update links")
    print("-" * 40)

    main_dir = Path(input("Main directory: ").strip('"')).resolve()
    html_file = Path(input("HTML file to rename: ").strip('"')).resolve()
    new_name = input("New filename (include .html): ").strip()

    if html_file.suffix.lower() != ".html":
        print("Must be a .html file")
        return

    if not new_name.endswith(".html"):
        print("New name must end with .html")
        return

    new_file = html_file.with_name(new_name)

    if new_file.exists():
        print("Target filename already exists")
        return

    global_assets_dir = (main_dir / "GlobalAssets").resolve()

    print(f"\nRenaming:\n{html_file.name} → {new_name}")
    confirm = input("Proceed?? [y/N]: ").lower()

    if confirm != "y":
        print("Cancelled")
        return

    # Rename file
    html_file.rename(new_file)

    old_name = html_file.name

    total_files = 0
    total_replacements = 0

    for file_path in main_dir.rglob("*"):
        if not file_path.is_file():
            continue

        if is_inside_global_assets(file_path.resolve(), global_assets_dir):
            continue

        if file_path.suffix.lower() not in {".html", ".json"}:
            continue

        count = process_file(file_path, old_name, new_name)
        if count > 0:
            total_files += 1
            total_replacements += count

    print("\nDone")
    print(f"Files updated: {total_files}")
    print(f"Total replacements: {total_replacements}")


if __name__ == "__main__":
    main()