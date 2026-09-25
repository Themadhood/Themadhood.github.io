import json
from pathlib import Path

#must be in root dir

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

ROOT_DIR = Path(__file__).resolve().parent

PEQUOT_SETTINGS = (
    ROOT_DIR
    / "Pequot"
    / "Assets"
    / "JSONs"
    / "Settings.json"
)


# ---------------------------------------------------------
# JSON Helpers
# ---------------------------------------------------------

def LoadJson(filePath):
    with open(filePath, "r", encoding="utf-8") as file:
        return json.load(file)


def SaveJson(filePath, data):
    with open(filePath, "w", encoding="utf-8") as file:
        json.dump(
            data,
            file,
            indent=4,
            ensure_ascii=False
        )

        # Keep newline at end of file
        file.write("\n")


# ---------------------------------------------------------
# Legal Settings
# ---------------------------------------------------------

def GetPequotLegalSettings():
    if not PEQUOT_SETTINGS.exists():
        raise FileNotFoundError(
            f"Pequot Settings.json not found:\n{PEQUOT_SETTINGS}"
        )

    pequotData = LoadJson(PEQUOT_SETTINGS)

    if "legal" not in pequotData:
        raise KeyError(
            "Pequot Settings.json does not contain a 'legal' section."
        )

    return pequotData["legal"]


# ---------------------------------------------------------
# Find Settings Files
# ---------------------------------------------------------

def FindSettingsFiles():
    settingsFiles = []

    for filePath in ROOT_DIR.rglob("Settings.json"):

        # Don't modify Pequot itself
        if filePath.resolve() == PEQUOT_SETTINGS.resolve():
            continue

        settingsFiles.append(filePath)

    return settingsFiles


# ---------------------------------------------------------
# Update Settings
# ---------------------------------------------------------

def UpdateSettingsFile(filePath, legalSettings):
    data = LoadJson(filePath)

    # Only replace/add the legal section.
    # All other settings remain unchanged.
    data["legal"] = legalSettings

    SaveJson(filePath, data)


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def Main():
    print("Legal Settings Copier")
    print("---------------------")
    print()

    legalSettings = GetPequotLegalSettings()

    settingsFiles = FindSettingsFiles()

    if not settingsFiles:
        print("No additional Settings.json files found.")
        return

    print(f"Master: {PEQUOT_SETTINGS.relative_to(ROOT_DIR)}")
    print()

    updatedCount = 0

    for filePath in settingsFiles:
        try:
            UpdateSettingsFile(
                filePath,
                legalSettings
            )

            print(
                f"UPDATED: {filePath.relative_to(ROOT_DIR)}"
            )

            updatedCount += 1

        except Exception as error:
            print(
                f"ERROR:   {filePath.relative_to(ROOT_DIR)}"
            )
            print(f"         {error}")

    print()
    print("---------------------")
    print(f"Updated {updatedCount} Settings.json files.")


if __name__ == "__main__":
    Main()
