# BuildBranchRedirectTree.py
# Builds the branch redirect tree, for example:
# /Pequot/Media/
#
# This script reads the branch relationships from each branch folder's
# Index.json file, then creates redirect copies of index_.html files
# so the branch hierarchy is physically represented on disk.

import json
import shutil
from pathlib import Path
from urllib.parse import parse_qs, urlparse


# ---------------------------------------------------------------------------
# user input helpers
# ---------------------------------------------------------------------------

def get_existing_dir(prompt: str) -> Path:
	# Ask until the user gives a valid existing directory.
	while True:
		raw_value: str = input(prompt).strip().strip('"')
		dir_path: Path = Path(raw_value)

		if dir_path.exists() and dir_path.is_dir():
			return dir_path

		print("Invalid directory. Please enter an existing folder path.")


# ---------------------------------------------------------------------------
# json loading helpers
# ---------------------------------------------------------------------------

def load_json_file(json_file_path: Path) -> dict | None:
	# Load a JSON file safely and return None on failure.
	try:
		return json.loads(json_file_path.read_text(encoding="utf-8"))
	except Exception as exc:
		print(f"Failed to read JSON '{json_file_path}': {exc}")
		return None


def get_branch_index_json_path(branch_dir: Path) -> Path:
	# Each branch stores its main branch-definition JSON here:
	# /Branch/Assets/JSONs/Index.json
	return branch_dir / "Assets" / "JSONs" / "Index.json"


def get_index_branch_items(branch_dir: Path) -> list[dict]:
	# Read the branch items from the branch's Index.json file.
	#
	# Expected location:
	# /Branch/Assets/JSONs/Index.json
	#
	# Expected shape:
	# {
	#     "branches": {
	#         "items": [
	#             {"href": "..."},
	#             ...
	#         ]
	#     }
	# }

	index_json_path: Path = get_branch_index_json_path(branch_dir)

	if not index_json_path.exists():
		print(f"Info: '{branch_dir.name}' has no Index.json at '{index_json_path}'.")
		return []

	json_data: dict | None = load_json_file(index_json_path)
	if json_data is None:
		return []

	branches_data: dict = json_data.get("branches", {})
	branch_items: list = branches_data.get("items", [])

	if not isinstance(branch_items, list):
		print(
			f"Info: '{index_json_path}' does not contain "
			f"'branches.items' as a list."
		)
		return []

	valid_items: list[dict] = []

	for item in branch_items:
		if isinstance(item, dict):
			valid_items.append(item)

	return valid_items


# ---------------------------------------------------------------------------
# branch discovery helpers
# ---------------------------------------------------------------------------

def is_branch_dir(candidate_dir: Path) -> bool:
	# A folder is treated as a branch folder if:
	# 1. it is a directory
	# 2. it contains an Assets folder
	#
	# This matches your earlier structure expectations.
	if not candidate_dir.is_dir():
		return False

	if not (candidate_dir / "Assets").exists():
		return False

	return True


def collect_top_level_branches(root_dir: Path) -> dict[str, Path]:
	# Build a case-insensitive map of top-level branch folder names
	# to their real paths.
	branch_map: dict[str, Path] = {}

	for item_path in sorted(root_dir.iterdir(), key=lambda p: p.name.casefold()):
		if not is_branch_dir(item_path):
			continue

		branch_map[item_path.name.casefold()] = item_path

	return branch_map


def normalize_branch_name(name: str) -> str:
	# Normalize names for case-insensitive matching.
	return name.strip().strip("/\\").casefold()


def try_extract_branch_from_query(href_value: str) -> str | None:
	# Support links like:
	#   Index.html?branch=Media
	#   /some/path/?branch=Media
	parsed = urlparse(href_value)
	query = parse_qs(parsed.query)

	branch_values: list[str] = query.get("branch", [])
	if not branch_values:
		return None

	branch_id: str = branch_values[0].strip()
	if not branch_id:
		return None

	return normalize_branch_name(branch_id)


def try_extract_branch_from_path(
	href_value: str,
	top_level_branch_map: dict[str, Path],
) -> str | None:
	# Support links like:
	#   Media
	#   /Pequot/Media/
	#   ./Media
	#   ../Media
	#
	# Strategy:
	# 1. split the path into segments
	# 2. walk from the end toward the front
	# 3. return the first segment that matches a known top-level branch name

	parsed = urlparse(href_value)
	path_text: str = parsed.path.strip()

	if not path_text:
		# If href is just "Media" without a slash-heavy path structure,
		# urlparse will still place it into path, so this mainly protects
		# against empty strings.
		return None

	segments: list[str] = []
	for raw_segment in path_text.replace("\\", "/").split("/"):
		segment: str = raw_segment.strip()
		if not segment:
			continue

		if segment in {".", ".."}:
			continue

		segments.append(segment)

	# Check from the end because the final meaningful path segment
	# is usually the branch name.
	for segment in reversed(segments):
		normalized_segment: str = normalize_branch_name(segment)
		if normalized_segment in top_level_branch_map:
			return normalized_segment

	return None


def extract_branch_id_from_href(
	href_value: str,
	top_level_branch_map: dict[str, Path],
) -> str | None:
	# Resolve a branch id from href using multiple strategies.
	#
	# Supported forms:
	#   ?branch=Media
	#   /Pequot/Media/
	#   Media
	#   ./Media
	#   ../Media

	href_value = href_value.strip()
	if not href_value:
		return None

	# Step 1: explicit query parameter wins.
	branch_id: str | None = try_extract_branch_from_query(href_value)
	if branch_id:
		return branch_id

	# Step 2: try to infer from path segments.
	branch_id = try_extract_branch_from_path(href_value, top_level_branch_map)
	if branch_id:
		return branch_id

	# Step 3: treat the whole raw href as a possible branch name.
	raw_name_guess: str = normalize_branch_name(href_value)
	if raw_name_guess in top_level_branch_map:
		return raw_name_guess

	return None


def find_top_level_branch_dir(
	branch_id: str,
	top_level_branch_map: dict[str, Path],
) -> Path | None:
	# Resolve a normalized branch id to the actual top-level branch dir.
	return top_level_branch_map.get(branch_id)


# ---------------------------------------------------------------------------
# redirect scanning helpers
# ---------------------------------------------------------------------------

def has_redirect_file(dir_path: Path) -> bool:
	# A redirect source is considered valid if it contains index_.html.
	return (dir_path / "index_.html").exists()


def copy_single_redirect_file(source_dir: Path, target_dir: Path) -> bool:
	# Copy source_dir/index_.html to target_dir/index.html.
	#
	# Returns True only if the source redirect existed and was copied.
	source_redirect_path: Path = source_dir / "index_.html"
	target_redirect_path: Path = target_dir / "index.html"

	if not source_redirect_path.exists():
		return False

	target_dir.mkdir(parents=True, exist_ok=True)
	shutil.copy2(source_redirect_path, target_redirect_path)
	return True


def is_reserved_real_sub_branch_name(
	dir_name: str,
	top_level_branch_map: dict[str, Path],
) -> bool:
	# A child folder is skipped as a redirect folder if its name matches
	# a real top-level branch name. This prevents accidental redirect copying
	# from folders that are meant to represent actual branch nodes.
	return dir_name.casefold() in top_level_branch_map


def find_direct_child_redirect_dirs(
	source_branch_dir: Path,
	top_level_branch_map: dict[str, Path],
) -> list[Path]:
	# Find all direct child folders of a branch that should be treated
	# as redirect folders.
	#
	# Rules:
	# - must be a directory
	# - must NOT match a real top-level branch name
	# - must contain index_.html

	redirect_dirs: list[Path] = []

	for child_path in sorted(source_branch_dir.iterdir(), key=lambda p: p.name.casefold()):
		if not child_path.is_dir():
			continue

		if is_reserved_real_sub_branch_name(child_path.name, top_level_branch_map):
			continue

		if not has_redirect_file(child_path):
			continue

		redirect_dirs.append(child_path)

	return redirect_dirs


def copy_branch_redirects(
	source_branch_dir: Path,
	target_branch_dir: Path,
	top_level_branch_map: dict[str, Path],
) -> list[Path]:
	# Copy the redirect files for:
	# 1. the branch root itself, if it has index_.html
	# 2. each direct child redirect dir
	#
	# Returns a list of target paths that were created.

	created_target_dirs: list[Path] = []

	# Step 1: copy the root redirect if present.
	if copy_single_redirect_file(source_branch_dir, target_branch_dir):
		created_target_dirs.append(target_branch_dir)

	# Step 2: copy direct child redirect folders.
	for source_child_dir in find_direct_child_redirect_dirs(
		source_branch_dir,
		top_level_branch_map,
	):
		target_child_dir: Path = target_branch_dir / source_child_dir.name

		if copy_single_redirect_file(source_child_dir, target_child_dir):
			created_target_dirs.append(target_child_dir)

	return created_target_dirs


# ---------------------------------------------------------------------------
# tree building helpers
# ---------------------------------------------------------------------------

def add_created_branch_path(
	created_paths_by_branch: dict[str, set[str]],
	branch_name: str,
	branch_path: Path,
) -> None:
	# Track every known or created path for summary output.
	created_paths_by_branch.setdefault(branch_name, set()).add(str(branch_path))


def should_skip_recursive_loop(
	child_source_branch_dir: Path,
	active_chain: set[str],
) -> bool:
	# Prevent infinite loops like:
	# Pequot -> Media -> Pequot -> ...
	return child_source_branch_dir.name.casefold() in active_chain


def build_child_target_dir(
	target_parent_dir: Path,
	child_source_branch_dir: Path,
) -> Path:
	# The child branch gets created under the current target parent dir.
	return target_parent_dir / child_source_branch_dir.name


def get_child_branch_id_from_item(
	item: dict,
	top_level_branch_map: dict[str, Path],
) -> str | None:
	# Pull and resolve the child branch reference from a single branch item.
	href_value: str = str(item.get("href", "")).strip()
	return extract_branch_id_from_href(href_value, top_level_branch_map)


def process_single_branch_item(
	source_branch_dir: Path,
	target_parent_dir: Path,
	item: dict,
	top_level_branch_map: dict[str, Path],
	created_paths_by_branch: dict[str, set[str]],
	active_chain: set[str],
) -> None:
	# Process one child item from a branch's Index.json.

	child_branch_id: str | None = get_child_branch_id_from_item(
		item,
		top_level_branch_map,
	)

	if not child_branch_id:
		href_value: str = str(item.get("href", "")).strip()
		print(
			f"Skipped item in '{source_branch_dir.name}': could not resolve "
			f"branch from href '{href_value}'."
		)
		return

	child_source_branch_dir: Path | None = find_top_level_branch_dir(
		child_branch_id,
		top_level_branch_map,
	)

	if child_source_branch_dir is None:
		print(
			f"Skipped missing branch source for '{child_branch_id}' "
			f"referenced in '{source_branch_dir.name}'."
		)
		return

	if should_skip_recursive_loop(child_source_branch_dir, active_chain):
		print(
			f"Skipped recursive loop: {' -> '.join(sorted(active_chain))} -> "
			f"{child_source_branch_dir.name}"
		)
		return

	child_target_dir: Path = build_child_target_dir(
		target_parent_dir,
		child_source_branch_dir,
	)

	created_target_dirs: list[Path] = copy_branch_redirects(
		source_branch_dir=child_source_branch_dir,
		target_branch_dir=child_target_dir,
		top_level_branch_map=top_level_branch_map,
	)

	if created_target_dirs:
		add_created_branch_path(
			created_paths_by_branch,
			child_source_branch_dir.name,
			child_target_dir,
		)

		print(f"Created branch path: {child_target_dir}")

		for created_dir in created_target_dirs:
			if created_dir != child_target_dir:
				print(f"  Copied redirect dir: {created_dir}")
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


def build_branch_tree(
	source_branch_dir: Path,
	target_parent_dir: Path,
	top_level_branch_map: dict[str, Path],
	created_paths_by_branch: dict[str, set[str]],
	active_chain: set[str],
) -> None:
	# Read the current branch's Index.json and recursively build children
	# beneath the current target parent directory.

	branch_items: list[dict] = get_index_branch_items(source_branch_dir)

	if not branch_items:
		print(f"Info: '{source_branch_dir.name}' has no branch items to process.")
		return

	for item in branch_items:
		process_single_branch_item(
			source_branch_dir=source_branch_dir,
			target_parent_dir=target_parent_dir,
			item=item,
			top_level_branch_map=top_level_branch_map,
			created_paths_by_branch=created_paths_by_branch,
			active_chain=active_chain,
		)


# ---------------------------------------------------------------------------
# reporting helpers
# ---------------------------------------------------------------------------

def print_branch_discovery_summary(top_level_branch_map: dict[str, Path]) -> None:
	# Print the discovered top-level branches before the build begins.
	print("Discovered top-level branches:")
	for branch_dir in sorted(top_level_branch_map.values(), key=lambda p: p.name.casefold()):
		print(f"  {branch_dir.name}")
	print()


def print_created_paths_summary(created_paths_by_branch: dict[str, set[str]]) -> None:
	# Print the final path summary grouped by branch name.
	print("\nDone.\n")
	print("Created/known paths by branch:")

	for branch_name in sorted(created_paths_by_branch, key=str.casefold):
		print(f"\n{branch_name}:")
		for branch_path in sorted(created_paths_by_branch[branch_name]):
			print(f"  {branch_path}")


# ---------------------------------------------------------------------------
# main entry
# ---------------------------------------------------------------------------

def main() -> None:
	print("Branch Redirect Tree Builder\n")

	root_dir: Path = get_existing_dir(
		"Enter the root directory that contains the branch folders: "
	)

	top_level_branch_map: dict[str, Path] = collect_top_level_branches(root_dir)

	if not top_level_branch_map:
		print("No branch folders with an Assets directory were found.")
		return

	print_branch_discovery_summary(top_level_branch_map)

	created_paths_by_branch: dict[str, set[str]] = {}

	# Seed the summary with the real top-level paths that already exist.
	for branch_dir in sorted(top_level_branch_map.values(), key=lambda p: p.name.casefold()):
		add_created_branch_path(
			created_paths_by_branch,
			branch_dir.name,
			branch_dir,
		)

	# Build child trees for every discovered top-level branch.
	for branch_dir in sorted(top_level_branch_map.values(), key=lambda p: p.name.casefold()):
		print(f"\nReading top-level branch: {branch_dir.name}")

		build_branch_tree(
			source_branch_dir=branch_dir,
			target_parent_dir=branch_dir,
			top_level_branch_map=top_level_branch_map,
			created_paths_by_branch=created_paths_by_branch,
			active_chain={branch_dir.name.casefold()},
		)

	print_created_paths_summary(created_paths_by_branch)


if __name__ == "__main__":
	main()
