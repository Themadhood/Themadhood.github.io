from __future__ import annotations

import re
import shutil
from pathlib import Path


TEXT_SUFFIXES: set[str] = {
	".html",
	".htm",
	".json",
	".js",
	".css",
	".txt",
	".md",
}


def get_existing_dir(prompt: str) -> Path:
	while True:
		raw_value: str = input(prompt).strip().strip('"')
		dir_path: Path = Path(raw_value).expanduser().resolve()

		if dir_path.exists() and dir_path.is_dir():
			return dir_path

		print("Invalid directory. Please enter an existing folder path.")


def get_non_empty_input(prompt: str) -> str:
	while True:
		value: str = input(prompt).strip()
		if value:
			return value
		print("Please enter a value.")


def get_yes_no(prompt: str, default: bool = True) -> bool:
	default_text: str = "Y/n" if default else "y/N"

	while True:
		raw_value: str = input(f"{prompt} [{default_text}]: ").strip().casefold()

		if not raw_value:
			return default

		if raw_value in {"y", "yes"}:
			return True

		if raw_value in {"n", "no"}:
			return False

		print("Please enter yes or no.")


def collect_top_level_branches(root_dir: Path) -> dict[str, Path]:
	branch_map: dict[str, Path] = {}

	for item_path in sorted(root_dir.iterdir(), key=lambda p: p.name.casefold()):
		if not item_path.is_dir():
			continue

		if (item_path / "Assets").exists():
			branch_map[item_path.name.casefold()] = item_path

	return branch_map


def print_available_branches(branch_map: dict[str, Path]) -> None:
	branch_names: list[str] = sorted(path.name for path in branch_map.values())

	print("\nAvailable branches:")
	for branch_name in branch_names:
		print(f"- {branch_name}")


def get_source_branch_dir(branch_map: dict[str, Path]) -> Path:
	print_available_branches(branch_map)

	while True:
		source_branch_name: str = input(
			"\nEnter the SOURCE branch name the feature is currently in: "
		).strip()

		if not source_branch_name:
			print("Please enter a branch name.")
			continue

		source_branch_dir: Path | None = branch_map.get(source_branch_name.casefold())
		if source_branch_dir is not None:
			return source_branch_dir

		print("Branch not found. Enter one of the branch names listed above.")


def find_feature_dir_in_branch(feature_name: str, source_branch_dir: Path) -> Path | None:
	feature_name_cf: str = feature_name.casefold()
	matches: list[Path] = []

	for dir_path in source_branch_dir.rglob("*"):
		if not dir_path.is_dir():
			continue

		if dir_path.name.casefold() != feature_name_cf:
			continue

		matches.append(dir_path)

	if not matches:
		return None

	if len(matches) == 1:
		return matches[0]

	print("\nMultiple matching feature folders were found inside the source branch:\n")
	for index, feature_dir in enumerate(matches, start=1):
		print(f"{index}. {feature_dir}")

	while True:
		raw_value: str = input("\nChoose the source feature number: ").strip()
		if raw_value.isdigit():
			selection: int = int(raw_value)
			if 1 <= selection <= len(matches):
				return matches[selection - 1]
		print("Invalid selection.")


def is_text_file(file_path: Path) -> bool:
	return file_path.suffix.casefold() in TEXT_SUFFIXES


def replace_branch_targets(text: str, source_branch_name: str, target_branch_name: str) -> str:
	source_branch_slug: str = source_branch_name.casefold()
	target_branch_slug: str = target_branch_name.casefold()

	updated_text: str = text

	patterns: list[tuple[str, str]] = [
		(rf"([?&]branch=){re.escape(source_branch_slug)}(?=\b)", rf"\1{target_branch_slug}"),
		(rf"([?&]branch=){re.escape(source_branch_name)}(?=\b)", rf"\1{target_branch_slug}"),
		(rf"(?<=/){re.escape(source_branch_name)}(?=/)", target_branch_name),
		(rf"(?<=/){re.escape(source_branch_slug)}(?=/)", target_branch_name),
		(rf"(?<=['\"`]){re.escape(source_branch_name)}(?=/)", target_branch_name),
		(rf"(?<=['\"`]){re.escape(source_branch_slug)}(?=/)", target_branch_name),
	]

	for pattern, replacement in patterns:
		updated_text = re.sub(pattern, replacement, updated_text)

	return updated_text


def update_text_file_for_target(
	file_path: Path,
	source_branch_name: str,
	target_branch_name: str,
) -> bool:
	if not is_text_file(file_path):
		return False

	try:
		original_text: str = file_path.read_text(encoding="utf-8")
	except UnicodeDecodeError:
		return False

	updated_text: str = replace_branch_targets(
		text=original_text,
		source_branch_name=source_branch_name,
		target_branch_name=target_branch_name,
	)

	if updated_text == original_text:
		return False

	file_path.write_text(updated_text, encoding="utf-8")
	return True


def get_json_file_in_branch(source_branch_dir: Path, json_name: str) -> Path | None:
	jsons_dir: Path = source_branch_dir / "Assets" / "JSONs"

	if not jsons_dir.exists() or not jsons_dir.is_dir():
		return None

	json_filename: str = json_name if json_name.casefold().endswith(".json") else f"{json_name}.json"
	source_json_path: Path = jsons_dir / json_filename

	if source_json_path.exists() and source_json_path.is_file():
		return source_json_path

	return None


def find_sub_branches_for_branch(
	branch_dir: Path,
	branch_map: dict[str, Path],
) -> list[Path]:
	found_branch_dirs: dict[str, Path] = {}
	source_branch_name_cf: str = branch_dir.name.casefold()

	for dir_path in branch_dir.rglob("*"):
		if not dir_path.is_dir():
			continue

		dir_name_cf: str = dir_path.name.casefold()

		if dir_name_cf == source_branch_name_cf:
			continue

		matching_branch_dir: Path | None = branch_map.get(dir_name_cf)
		if matching_branch_dir is None:
			continue

		found_branch_dirs[dir_name_cf] = matching_branch_dir

	return sorted(found_branch_dirs.values(), key=lambda p: p.name.casefold())


def parse_branch_names_input(raw_value: str) -> list[str]:
	cleaned_value: str = raw_value.strip()

	if not cleaned_value:
		return []

	if cleaned_value.casefold() == "all":
		return ["all"]

	return [part.strip() for part in cleaned_value.split(", ") if part.strip()]


def get_target_branch_dirs(
	branch_map: dict[str, Path],
	source_branch_dir: Path,
) -> list[Path]:
	print_available_branches(branch_map)

	raw_targets: str = input(
		"\nEnter target branch name(s) separated by ', ' or press Enter for all: "
	).strip()

	requested_names: list[str] = parse_branch_names_input(raw_targets)

	if not requested_names or requested_names == ["all"]:
		target_branch_dirs: list[Path] = sorted(
			[
				path
				for path in branch_map.values()
				if path != source_branch_dir
			],
			key=lambda p: p.name.casefold(),
		)
	else:
		target_name_map: dict[str, Path] = {}
		missing_names: list[str] = []

		for branch_name in requested_names:
			matched_branch_dir: Path | None = branch_map.get(branch_name.casefold())
			if matched_branch_dir is None:
				missing_names.append(branch_name)
				continue

			if matched_branch_dir == source_branch_dir:
				continue

			target_name_map[matched_branch_dir.name.casefold()] = matched_branch_dir

		if missing_names:
			print(f"\nThese branches were not found: {', '.join(missing_names)}")
			print("Please try again.")
			return get_target_branch_dirs(branch_map, source_branch_dir)

		include_sub_branches: bool = get_yes_no(
			"Also include sub-branches found in each selected branch?",
			default=True,
		)

		if include_sub_branches:
			for selected_branch_dir in list(target_name_map.values()):
				for sub_branch_dir in find_sub_branches_for_branch(selected_branch_dir, branch_map):
					if sub_branch_dir == source_branch_dir:
						continue
					target_name_map[sub_branch_dir.name.casefold()] = sub_branch_dir

		target_branch_dirs = sorted(
			target_name_map.values(),
			key=lambda p: p.name.casefold(),
		)

	return target_branch_dirs


def copy_feature_dir_to_branch(
	source_branch_dir: Path,
	source_feature_dir: Path,
	target_branch_dir: Path,
	source_json_path: Path | None = None,
) -> tuple[Path, int, list[Path]]:
	relative_feature_path: Path = source_feature_dir.relative_to(source_branch_dir)
	target_feature_dir: Path = target_branch_dir / relative_feature_path

	if target_feature_dir.exists():
		shutil.rmtree(target_feature_dir)

	shutil.copytree(source_feature_dir, target_feature_dir)

	updated_file_count: int = 0

	for copied_path in target_feature_dir.rglob("*"):
		if not copied_path.is_file():
			continue

		if update_text_file_for_target(
			file_path=copied_path,
			source_branch_name=source_branch_dir.name,
			target_branch_name=target_branch_dir.name,
		):
			updated_file_count += 1

	copied_json_paths: list[Path] = []

	if source_json_path is not None:
		target_jsons_dir: Path = target_branch_dir / "Assets" / "JSONs"
		target_jsons_dir.mkdir(parents=True, exist_ok=True)

		target_json_path: Path = target_jsons_dir / source_json_path.name
		shutil.copy2(source_json_path, target_json_path)
		copied_json_paths.append(target_json_path)

		if update_text_file_for_target(
			file_path=target_json_path,
			source_branch_name=source_branch_dir.name,
			target_branch_name=target_branch_dir.name,
		):
			updated_file_count += 1

	return target_feature_dir, updated_file_count, copied_json_paths


def main() -> None:
	print("Feature Branch Copier\n")

	root_dir: Path = get_existing_dir(
		"Enter the root directory for the main repo: "
	)
	feature_name: str = get_non_empty_input(
		"Enter the feature folder name to copy (example: BizCard): "
	)
	json_name: str = get_non_empty_input(
		"Enter the JSON file name to copy from Assets/JSONs (with or without .json): "
	)

	branch_map: dict[str, Path] = collect_top_level_branches(root_dir)
	if not branch_map:
		print("No top-level branches with Assets folders were found.")
		return

	source_branch_dir: Path = get_source_branch_dir(branch_map)

	source_feature_dir: Path | None = find_feature_dir_in_branch(feature_name, source_branch_dir)
	if source_feature_dir is None:
		print(
			f"No feature folder named '{feature_name}' was found inside the source branch '{source_branch_dir.name}'."
		)
		

	source_json_path: Path | None = get_json_file_in_branch(source_branch_dir, json_name)
	if source_json_path is None:
		print(
			f"No JSON file named '{json_name}' was found in '{source_branch_dir / 'Assets' / 'JSONs'}'."
		)
		

	target_branch_dirs: list[Path] = get_target_branch_dirs(
		branch_map=branch_map,
		source_branch_dir=source_branch_dir,
	)

	if not target_branch_dirs:
		print("\nNo target branches selected.")
		return

	print(f"\nSource branch: {source_branch_dir.name}")
	print(f"Source feature path: {source_feature_dir}")
	print(f"Source JSON path: {source_json_path}")

	print("\nTarget branches:")
	for branch_dir in target_branch_dirs:
		print(f"- {branch_dir.name}")

	print("\nCopying...\n")

	for target_branch_dir in target_branch_dirs:
		target_feature_dir, updated_file_count, copied_json_paths = copy_feature_dir_to_branch(
			source_branch_dir=source_branch_dir,
			source_feature_dir=source_feature_dir,
			target_branch_dir=target_branch_dir,
			source_json_path=source_json_path,
		)

		json_note: str = ""
		if copied_json_paths:
			json_note = f" | Copied JSON: {', '.join(str(path) for path in copied_json_paths)}"

		print(
			f"Created: {target_feature_dir} | "
			f"Updated text files: {updated_file_count}"
			f"{json_note}"
		)

	print("\nDone.")


if __name__ == "__main__":
	main()
