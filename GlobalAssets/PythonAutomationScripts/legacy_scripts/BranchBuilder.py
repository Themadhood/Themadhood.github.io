#reads all jsons in local jsons and builds files
#now irevivent

import json
from pathlib import Path


def get_existing_dir(prompt: str) -> Path:
    while True:
        raw_value = input(prompt).strip().strip('"')
        dir_path = Path(raw_value)

        if dir_path.exists() and dir_path.is_dir():
            return dir_path

        print("Invalid directory. Please enter an existing folder path.")


def write_json_file(file_path: Path, data: dict) -> None:
    file_path.write_text(
        json.dumps(data, indent=4, ensure_ascii=False),
        encoding="utf-8",
    )


def build_settings_data(source_data: dict) -> dict:
    site_data: dict = source_data.get("site", {})
    brand_data: dict = site_data.get("brand", {})
    footer_data: dict = source_data.get("footer", {})
    nav_data: dict = source_data.get("nav", {})

    settings_data: dict = {
        "branchId": source_data.get("branchId", ""),
        "site": {
            "tagline": site_data.get("tagline", ""),
            "metaDescription": site_data.get("metaDescription", ""),
        },
        "brand": {
            "title": site_data.get("title", ""),
            "email": footer_data.get("email", ""),
            "logo": brand_data.get("logo", ""),
            "background": brand_data.get("heroBackground", ""),
            "copyright": footer_data.get("copyright", ""),
            "brandContext": footer_data.get("line2", ""),
            "colors": brand_data.get("colors", {}),
        },
        "nav": nav_data,
    }

    return settings_data


def build_index_data(source_data: dict) -> dict:
    pages_data: dict = source_data.get("pages", {})
    home_data: dict = pages_data.get("home", {})

    index_data: dict = {
        "hero": home_data.get("hero", {}),
        "about": home_data.get("about", {}),
        "branches": home_data.get("branches", {}),
    }

    return index_data


def build_links_data(source_data: dict) -> dict:
    pages_data: dict = source_data.get("pages", {})
    links_page_data: dict = pages_data.get("links", {})

    links_data: dict = {
        "sections": links_page_data.get("sections", []),
    }

    return links_data

def build_root_index__html(branch_id: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=https://Themadhood.github.io/{branch_id}">
  <script>
    window.location.replace("https://Themadhood.github.io/{branch_id}");
  </script>
</head>
<body></body>
</html>
"""


def build_links_index__html(branch_id: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=https://Themadhood.github.io/{branch_id}/Links">
  <script>
    window.location.replace("https://Themadhood.github.io/{branch_id}/Links");
  </script>
</head>
<body></body>
</html>
"""


def build_root_index_html(branch_id: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=../index.html?branch={branch_id}">
  <script>
    window.location.replace("../index.html?branch={branch_id}");
  </script>
</head>
<body></body>
</html>
"""


def build_links_index_html(branch_id: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=../../links.html?branch={branch_id}">
  <script>
    window.location.replace("../../links.html?branch={branch_id}");
  </script>
</head>
<body></body>
</html>
"""


def process_branch_json(json_file_path: Path, destination_root_dir: Path) -> None:
    print(f"\nReading: {json_file_path.name}")

    try:
        source_data: dict = json.loads(json_file_path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Failed to read JSON: {exc}")
        return

    branch_id: str = source_data.get("branchId", "").strip()

    if not branch_id:
        print("Skipped: missing branchId")
        return

    branch_dir: Path = destination_root_dir / branch_id.capitalize()
    links_dir: Path = branch_dir / "Links"
    assets_dir: Path = branch_dir / "Assets"

    try:
        branch_dir.mkdir(parents=True, exist_ok=True)
        links_dir.mkdir(parents=True, exist_ok=True)
        assets_dir.mkdir(parents=True, exist_ok=True)

        settings_data: dict = build_settings_data(source_data)
        index_data: dict = build_index_data(source_data)
        links_data: dict = build_links_data(source_data)

        write_json_file(branch_dir / "Settings.json", settings_data)
        write_json_file(branch_dir / "Index.json", index_data)
        write_json_file(branch_dir / "Links.json", links_data)

        (branch_dir / "index.html").write_text(
            build_root_index_html(branch_id),
            encoding="utf-8",
        )

        (links_dir / "index.html").write_text(
            build_links_index_html(branch_id),
            encoding="utf-8",
        )
        (branch_dir / "index_.html").write_text(
            build_root_index__html(branch_id.capitalize()),
            encoding="utf-8",
        )

        (links_dir / "index_.html").write_text(
            build_links_index__html(branch_id.capitalize()),
            encoding="utf-8",
        )

        (assets_dir / "place holder.txt").write_text("...\n", encoding="utf-8")

        print(f"Created: {branch_dir}")

    except Exception as exc:
        print(f"Failed to build branch '{branch_id}': {exc}")


def main() -> None:
    print("Branch Directory Builder\n")

    content_dir: Path = get_existing_dir(
        "Enter the folder that contains the branch JSON files: "
    )

    dest_dir: Path = get_existing_dir(
        "Enter the destination folder where branch directories will be created: "
    )

    json_file_paths: list[Path] = sorted(content_dir.glob("*.json"))

    if not json_file_paths:
        print("\nNo JSON files found in the content directory.")
        return

    print(f"\nFound {len(json_file_paths)} JSON file(s).")

    for json_file_path in json_file_paths:
        process_branch_json(json_file_path, dest_dir)

    print("\nDone.")


if __name__ == "__main__":
    main()
