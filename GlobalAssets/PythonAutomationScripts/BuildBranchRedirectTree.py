import json
import shutil
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def get_existing_dir(prompt: str) -> Path:
    while True:
        raw_value: str = input(prompt).strip().strip('"')
        dir_path: Path = Path(raw_value)

        if dir_path.exists() and dir_path.is_dir():
            return dir_path

        print("Invalid directory. Please enter an existing folder path.")


def load_json_file(json_file_path: Path) -> dict | None:
    try:
        return json.loads(json_file_path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Failed to read JSON '{json_file_path}': {exc}")
        return None


def get_index_branch_items(branch_dir: Path) -> list[dict]:
    index_json_path: Path = branch_dir / "Index.json"

    if not index_json_path.exists():
        return []

    json_data: dict | None = load_json_file(index_json_path)
    if json_data is None:
        return []

    branches_data: dict = json_data.get("branches", {})
    branch_items: list = branches_data.get("items", [])

    if not isinstance(branch_items, list):
        return []

    valid_items: list[dict] = []
    for item in branch_items:
        if isinstance(item, dict):
            valid_items.append(item)

    return valid_items


def collect_top_level_branches(root_dir: Path) -> dict[str, Path]:
    branch_map: dict[str, Path] = {}

    for item_path in sorted(root_dir.iterdir()):
        if not item_path.is_dir():
            continue

        if (item_path / "Index.json").exists():
            branch_map[item_path.name.casefold()] = item_path

    return branch_map


def extract_branch_id_from_href(href_value: str) -> str | None:
    href_value = href_value.strip()
    if not href_value:
        return None

    parsed = urlparse(href_value)
    query = parse_qs(parsed.query)

    branch_values: list[str] = query.get("branch", [])
    if branch_values:
        branch_id: str = branch_values[0].strip()
        if branch_id:
            return branch_id.casefold()

    return None


def find_top_level_branch_dir(
    branch_id: str,
    top_level_branch_map: dict[str, Path],
) -> Path | None:
    if branch_id in top_level_branch_map:
        return top_level_branch_map[branch_id]

    for branch_dir in top_level_branch_map.values():
        if branch_dir.name.casefold() == branch_id:
            return branch_dir

    return None


def copy_redirect_files(
    source_branch_dir: Path,
    target_branch_dir: Path,
    top_level_branch_map: dict[str, Path],
) -> bool:
    copied_anything: bool = False

    #copy the root redirect if present
    source_root_redirect: Path = source_branch_dir / "index_.html"
    if source_root_redirect.exists():
        target_branch_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_root_redirect, target_branch_dir / "index.html")
        copied_anything = True

    #scan only direct child dirs of the branch
    for child_path in sorted(source_branch_dir.iterdir()):
        if not child_path.is_dir():
            continue

        #skip real sub-branches
        if child_path.name.casefold() in top_level_branch_map:
            continue

        #treat everything else as a redirect dir if it has index_.html
        source_child_redirect: Path = child_path / "index_.html"
        if not source_child_redirect.exists():
            continue

        target_child_dir: Path = target_branch_dir / child_path.name
        target_child_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_child_redirect, target_child_dir / "index.html")
        copied_anything = True

    return copied_anything


def build_branch_tree(
    source_branch_dir: Path,
    target_parent_dir: Path,
    top_level_branch_map: dict[str, Path],
    created_paths_by_branch: dict[str, set[str]],
    active_chain: set[str],
) -> None:
    branch_items: list[dict] = get_index_branch_items(source_branch_dir)

    if not branch_items:
        return

    for item in branch_items:
        href_value: str = str(item.get("href", "")).strip()
        child_branch_id: str | None = extract_branch_id_from_href(href_value)

        if not child_branch_id:
            continue

        child_source_branch_dir: Path | None = find_top_level_branch_dir(
            child_branch_id,
            top_level_branch_map,
        )

        if child_source_branch_dir is None:
            print(
                f"Skipped missing branch source for '{child_branch_id}' "
                f"referenced in '{source_branch_dir.name}'."
            )
            continue

        if child_source_branch_dir.name.casefold() in active_chain:
            print(
                f"Skipped recursive loop: {' -> '.join(sorted(active_chain))} -> "
                f"{child_source_branch_dir.name}"
            )
            continue

        child_target_dir: Path = target_parent_dir / child_source_branch_dir.name

        copied_anything: bool = copy_redirect_files(
            child_source_branch_dir,
            child_target_dir,
            top_level_branch_map,
        )

        if copied_anything:
            created_paths_by_branch.setdefault(
                child_source_branch_dir.name,
                set(),
            ).add(str(child_target_dir))
            print(f"Created: {child_target_dir}")
        else:
            print(
                f"Warning: no redirect source files found in "
                f"'{child_source_branch_dir}'."
            )

        next_active_chain: set[str] = set(active_chain)
        next_active_chain.add(child_source_branch_dir.name.casefold())

        build_branch_tree(
            source_branch_dir=child_source_branch_dir,
            target_parent_dir=child_target_dir,
            top_level_branch_map=top_level_branch_map,
            created_paths_by_branch=created_paths_by_branch,
            active_chain=next_active_chain,
        )


def main() -> None:
    print("Branch Redirect Tree Builder\n")

    root_dir: Path = get_existing_dir(
        "Enter the root directory that contains the branch folders: "
    )

    top_level_branch_map: dict[str, Path] = collect_top_level_branches(root_dir)

    if not top_level_branch_map:
        print("No branch folders with Index.json were found.")
        return

    created_paths_by_branch: dict[str, set[str]] = {}

    for branch_dir in sorted(top_level_branch_map.values(), key=lambda p: p.name.casefold()):
        created_paths_by_branch.setdefault(branch_dir.name, set()).add(str(branch_dir))

    for branch_dir in sorted(top_level_branch_map.values(), key=lambda p: p.name.casefold()):
        print(f"\nReading top-level branch: {branch_dir.name}")

        build_branch_tree(
            source_branch_dir=branch_dir,
            target_parent_dir=branch_dir,
            top_level_branch_map=top_level_branch_map,
            created_paths_by_branch=created_paths_by_branch,
            active_chain={branch_dir.name.casefold()},
        )

    print("\nDone.\n")
    print("Created/known paths by branch:")

    for branch_name in sorted(created_paths_by_branch, key=str.casefold):
        print(f"\n{branch_name}:")
        for branch_path in sorted(created_paths_by_branch[branch_name]):
            print(f"  {branch_path}")


if __name__ == "__main__":
    main()
