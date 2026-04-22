# FixRedirects.py
# Scans for index.html files with hardcoded redirects and converts them
# to dynamic domain-safe redirects using window.location.origin

from pathlib import Path
import re


# ------------------------------------------------------------------
# CONFIG
# ------------------------------------------------------------------

ROOT_DIR = Path(input("Enter root directory: ").strip().strip('"'))

# Regex to capture the path AFTER the domain
# Example:
# https://Themadhood.github.io/Photos/Gallery → /Photos/Gallery
REDIRECT_REGEX = re.compile(
	r"https?://[^/]+(?P<path>/[^\"]+)"
)


# ------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------

def is_index_file(file_path: Path) -> bool:
	return file_path.name.casefold() == "index.html"


def read_file_safe(file_path: Path) -> str | None:
	try:
		return file_path.read_text(encoding="utf-8")
	except Exception as e:
		print(f"Failed to read {file_path}: {e}")
		return None


def write_file_safe(file_path: Path, content: str) -> None:
	file_path.write_text(content, encoding="utf-8")


def extract_redirect_path(html: str) -> str | None:
	# Find first matching hardcoded URL and extract path
	match = REDIRECT_REGEX.search(html)
	if match:
		return match.group("path")
	return None


def build_dynamic_redirect_html(path: str) -> str:
	return f"""<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Redirecting...</title>

	<script>
		const target = window.location.origin + "{path}";
		window.location.replace(target);
	</script>

	<noscript>
		<meta http-equiv="refresh" content="0; url={path}">
	</noscript>
</head>
<body></body>
</html>
"""


def process_file(file_path: Path) -> None:
	html = read_file_safe(file_path)
	if html is None:
		return

	# Only process files that contain your domain
	if "Themadhood.github.io" not in html:
		return

	path = extract_redirect_path(html)

	if not path:
		print(f"Skipped (no valid redirect found): {file_path}")
		return

	new_html = build_dynamic_redirect_html(path)

	write_file_safe(file_path, new_html)

	print(f"Updated: {file_path} → {path}")


# ------------------------------------------------------------------
# MAIN
# ------------------------------------------------------------------

def main():
	print("Scanning for redirect files...\n")

	if not ROOT_DIR.exists():
		print("Invalid root directory.")
		return

	for file_path in ROOT_DIR.rglob("index.html"):
		if is_index_file(file_path):
			process_file(file_path)

	print("\nDone.")


if __name__ == "__main__":
	main()