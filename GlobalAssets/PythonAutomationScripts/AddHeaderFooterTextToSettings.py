import json
import os


def update_settings(settings_path):
    try:
        with open(settings_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        colors = data.get("brand", {}).get("colors")

        if not isinstance(colors, dict):
            print(f"SKIPPED - No brand.colors: {settings_path}")
            return

        text_color = colors.get("text")

        if not text_color:
            print(f"SKIPPED - No colors.text: {settings_path}")
            return

        changed = False

        if "topbarText" not in colors:
            colors["topbarText"] = text_color
            changed = True

        if "footerText" not in colors:
            colors["footerText"] = text_color
            changed = True

        if not changed:
            print(f"NO CHANGE: {settings_path}")
            return

        # Rebuild colors so the new settings are placed
        # directly after their related background settings.
        ordered_colors = {}

        for key, value in colors.items():
            ordered_colors[key] = value

            if key == "topbarBg":
                ordered_colors["topbarText"] = colors["topbarText"]

            if key == "footerBg":
                ordered_colors["footerText"] = colors["footerText"]

        data["brand"]["colors"] = ordered_colors

        with open(settings_path, "w", encoding="utf-8") as file:
            json.dump(
                data,
                file,
                indent=4,
                ensure_ascii=False
            )
            file.write("\n")

        print(f"UPDATED: {settings_path}")

    except json.JSONDecodeError as error:
        print(f"ERROR - Invalid JSON: {settings_path}")
        print(f"        {error}")

    except Exception as error:
        print(f"ERROR: {settings_path}")
        print(f"       {error}")


def main():
    print("Settings.json Text Color Updater")
    print()

    root_dir = input("Enter the root directory of the repo: ").strip().strip('"')

    if not os.path.isdir(root_dir):
        print()
        print("The directory does not exist.")
        return

    found = 0

    for current_dir, dirs, files in os.walk(root_dir):

        # Don't waste time scanning Git's internal files.
        if ".git" in dirs:
            dirs.remove(".git")

        for filename in files:
            if filename.lower() != "settings.json":
                continue

            found += 1

            settings_path = os.path.join(
                current_dir,
                filename
            )

            update_settings(settings_path)

    print()
    print(f"Finished. Found {found} Settings.json file(s).")


if __name__ == "__main__":
    main()
