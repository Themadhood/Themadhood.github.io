from pathlib import Path
import json
import tkinter as tk
from tkinter import ttk, messagebox

# ============================================================
# Settings
# ============================================================

COVER_SIZE = 50

# UI Colors
BG = "#17171C"
PANEL_BG = "#202027"
SELECT_BG = "#373747"
TEXT = "#FFFFFF"
SECONDARY_TEXT = "#C9C9D4"
BORDER = "#454550"
ENTRY_BG = "#101014"
ACCENT = "#3A6EA5"

# Keep this exact casing on purpose.
BASE_URL = "http://Themadhood.GitHub.io/Music/Albums/"

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}

try:
    from PIL import Image, ImageTk
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


# ============================================================
# Path setup
# ============================================================

SCRIPT_DIR = Path(__file__).resolve().parent

# Script lives in:
#   Music/Albums/Assets/Scripts
# Working directory becomes:
#   Music/Albums
ALBUMS_WORKING_DIR = SCRIPT_DIR.parents[1]

# Album folders live in:
#   Music/Albums/Albums
ALBUMS_DIR = ALBUMS_WORKING_DIR / "Albums"


# ============================================================
# Helpers
# ============================================================

def read_json(path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def clean_about(value):
    if value is None:
        return ""
    if isinstance(value, list):
        return "\n".join(str(item) for item in value if item is not None).strip()
    return str(value).strip()


def find_cover(album_dir):
    matches = []
    for path in album_dir.iterdir():
        if not path.is_file():
            continue
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if "cover" in path.stem.lower():
            matches.append(path)

    if not matches:
        return None

    return sorted(matches, key=lambda path: path.name.lower())[0]


def make_album_url(album_id):
    return f"{BASE_URL}?album={str(album_id).strip().upper()}"


def make_song_url(album_id, song_id):
    return (
        f"{BASE_URL}"
        f"?album={str(album_id).strip().upper()}"
        f"&song={str(song_id).strip().lower()}"
    )


def load_cover_image(path):
    if path is None:
        return None

    if PIL_AVAILABLE:
        image = Image.open(path)
        image.thumbnail((COVER_SIZE, COVER_SIZE))

        canvas = Image.new("RGBA", (COVER_SIZE, COVER_SIZE), (0, 0, 0, 0))
        x = (COVER_SIZE - image.width) // 2
        y = (COVER_SIZE - image.height) // 2

        if image.mode != "RGBA":
            image = image.convert("RGBA")

        canvas.paste(image, (x, y), image)
        return ImageTk.PhotoImage(canvas)

    if path.suffix.lower() in {".png", ".gif"}:
        try:
            return tk.PhotoImage(file=str(path))
        except tk.TclError:
            return None

    return None


def track_number(song_json):
    details = song_json.get("details")
    if isinstance(details, dict):
        value = details.get("Track")
        try:
            return int(value)
        except (TypeError, ValueError):
            pass
    return 999999


# ============================================================
# Data loading
# ============================================================

def load_albums():
    if not ALBUMS_DIR.exists():
        raise FileNotFoundError(f"Album directory was not found:\n{ALBUMS_DIR}")

    albums = []

    for album_dir in sorted(
        (path for path in ALBUMS_DIR.iterdir() if path.is_dir()),
        key=lambda path: path.name.lower()
    ):
        album_json_path = album_dir / "Album.json"

        if not album_json_path.exists():
            continue

        try:
            album_json = read_json(album_json_path)
        except Exception as error:
            print(f"Could not read {album_json_path}: {error}")
            continue

        songs = []

        for json_path in sorted(album_dir.glob("*.json"), key=lambda path: path.name.lower()):
            if json_path.name.lower() == "album.json":
                continue

            try:
                song_json = read_json(json_path)
            except Exception as error:
                print(f"Could not read {json_path}: {error}")
                continue

            song_id = str(song_json.get("id", "")).strip()
            if not song_id:
                continue

            songs.append({
                "id": song_id,
                "title": str(song_json.get("title") or song_json.get("name") or song_id).strip(),
                "about": clean_about(song_json.get("about")),
                "path": json_path,
                "json": song_json,
            })

        songs.sort(key=lambda song: (track_number(song["json"]), song["title"].lower()))

        albums.append({
            "id": album_dir.name,
            "name": album_dir.name,
            "about": clean_about(album_json.get("about")),
            "cover": find_cover(album_dir),
            "path": album_dir,
            "json": album_json,
            "songs": songs,
        })

    return albums


# ============================================================
# Scrollable list
# ============================================================

class ScrollableFrame(ttk.Frame):
    def __init__(self, parent):
        super().__init__(parent, style="Panel.TFrame")

        self.canvas = tk.Canvas(
            self,
            highlightthickness=0,
            bd=0,
            bg=PANEL_BG
        )

        self.scrollbar = ttk.Scrollbar(
            self,
            orient="vertical",
            command=self.canvas.yview
        )

        self.body = ttk.Frame(
            self.canvas,
            style="Panel.TFrame"
        )

        self.window_id = self.canvas.create_window(
            (0, 0),
            window=self.body,
            anchor="nw"
        )

        self.canvas.configure(
            yscrollcommand=self.scrollbar.set
        )

        self.body.bind(
            "<Configure>",
            self._update_scroll_region
        )

        self.canvas.bind(
            "<Configure>",
            self._resize_body
        )

        # Mouse wheel works only while the pointer is over this list.
        for widget in (self, self.canvas, self.body):
            widget.bind("<Enter>", self._bind_mousewheel)
            widget.bind("<Leave>", self._unbind_mousewheel)

        self.canvas.grid(
            row=0,
            column=0,
            sticky="nsew"
        )

        self.scrollbar.grid(
            row=0,
            column=1,
            sticky="ns"
        )

        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)

    def _update_scroll_region(self, event=None):
        self.canvas.configure(
            scrollregion=self.canvas.bbox("all")
        )

    def _resize_body(self, event):
        self.canvas.itemconfigure(
            self.window_id,
            width=event.width
        )

    def _bind_mousewheel(self, event=None):
        self.bind_all("<MouseWheel>", self._on_mousewheel)
        self.bind_all("<Button-4>", self._on_mousewheel_linux)
        self.bind_all("<Button-5>", self._on_mousewheel_linux)

    def _unbind_mousewheel(self, event=None):
        self.unbind_all("<MouseWheel>")
        self.unbind_all("<Button-4>")
        self.unbind_all("<Button-5>")

    def _on_mousewheel(self, event):
        if event.delta == 0:
            return

        direction = -1 if event.delta > 0 else 1

        self.canvas.yview_scroll(
            direction * 3,
            "units"
        )

    def _on_mousewheel_linux(self, event):
        direction = -1 if event.num == 4 else 1

        self.canvas.yview_scroll(
            direction * 3,
            "units"
        )


# ============================================================
# UI
# ============================================================

class URLBuilderApp(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("Album URL Builder")
        self.geometry("1180x760")
        self.minsize(900, 560)

        self.albums = []
        self.selected_album = None
        self.selected_song = None
        self.album_images = []
        self.url_var = tk.StringVar()

        self._setup_theme()
        self._build_ui()

        try:
            self.albums = load_albums()
        except Exception as error:
            messagebox.showerror("Album URL Builder", str(error))
            return

        self._show_albums()

    def _setup_theme(self):
        self.configure(bg=BG)

        style = ttk.Style(self)

        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure(
            ".",
            background=BG,
            foreground=TEXT
        )

        style.configure(
            "TFrame",
            background=BG
        )

        style.configure(
            "Header.TLabel",
            background=BG,
            foreground=TEXT,
            font=("Segoe UI", 16, "bold")
        )

        style.configure(
            "Section.TLabel",
            background=BG,
            foreground=TEXT,
            font=("Segoe UI", 11, "bold")
        )

        style.configure(
            "Card.TFrame",
            background=PANEL_BG,
            relief="flat",
            borderwidth=0
        )

        style.configure(
            "CardTitle.TLabel",
            background=PANEL_BG,
            foreground=TEXT,
            font=("Segoe UI", 10, "bold")
        )

        style.configure(
            "CardText.TLabel",
            background=PANEL_BG,
            foreground=SECONDARY_TEXT,
            font=("Segoe UI", 9)
        )

        style.configure(
            "Panel.TFrame",
            background=PANEL_BG
        )

        style.configure(
            "TLabel",
            background=BG,
            foreground=TEXT
        )

        style.configure(
            "Panel.TLabel",
            background=PANEL_BG,
            foreground=TEXT
        )

        style.configure(
            "Secondary.Panel.TLabel",
            background=PANEL_BG,
            foreground=SECONDARY_TEXT
        )

        style.configure(
            "TButton",
            background=ACCENT,
            foreground=TEXT,
            bordercolor=BORDER,
            focusthickness=1,
            focuscolor=BORDER,
            padding=6
        )

        style.map(
            "TButton",
            background=[
                ("active", SELECT_BG),
                ("pressed", SELECT_BG)
            ]
        )

        style.configure(
            "TEntry",
            fieldbackground=ENTRY_BG,
            foreground=TEXT,
            insertcolor=TEXT,
            bordercolor=BORDER
        )

        style.configure(
            "Vertical.TScrollbar",
            background=PANEL_BG,
            troughcolor=BG,
            bordercolor=BORDER,
            arrowcolor=TEXT
        )

    def _build_ui(self):
        main = ttk.Frame(self, padding=10)
        main.pack(fill="both", expand=True)

        main.rowconfigure(1, weight=1)
        main.columnconfigure(0, weight=1)
        main.columnconfigure(1, weight=1)

        ttk.Label(main, text="Albums", font=("TkDefaultFont", 12, "bold")).grid(
            row=0, column=0, sticky="w", padx=(0, 8)
        )
        ttk.Label(main, text="Songs", font=("TkDefaultFont", 12, "bold")).grid(
            row=0, column=1, sticky="w", padx=(8, 0)
        )

        self.album_list = ScrollableFrame(main)
        self.album_list.grid(row=1, column=0, sticky="nsew", padx=(0, 8))

        self.song_list = ScrollableFrame(main)
        self.song_list.grid(row=1, column=1, sticky="nsew", padx=(8, 0))

        bottom = ttk.Frame(main)
        bottom.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        bottom.columnconfigure(0, weight=1)

        self.about_label = ttk.Label(bottom, text="Select an album.", justify="left", wraplength=900)
        self.about_label.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 8))

        self.url_entry = ttk.Entry(bottom, textvariable=self.url_var)
        self.url_entry.grid(row=1, column=0, sticky="ew", padx=(0, 8))

        ttk.Button(bottom, text="Copy URL", command=self._copy_url).grid(row=1, column=1)

        if not PIL_AVAILABLE:
            ttk.Label(
                bottom,
                text="Pillow is not installed. PNG/GIF covers may still display; JPG/WEBP covers require Pillow."
            ).grid(row=2, column=0, columnspan=2, sticky="w", pady=(8, 0))

    def _clear_frame(self, frame):
        for widget in frame.winfo_children():
            widget.destroy()

    def _bind_click(self, widget, command):
        widget.bind("<Button-1>", command)
        for child in widget.winfo_children():
            self._bind_click(child, command)

    def _show_albums(self):
        self._clear_frame(self.album_list.body)
        self.album_images.clear()

        if not self.albums:
            ttk.Label(
                self.album_list.body,
                text="No album folders containing Album.json were found."
            ).pack(anchor="w", padx=8, pady=8)
            return

        for album in self.albums:
            row = ttk.Frame(self.album_list.body, padding=6, relief="solid", borderwidth=1)
            row.pack(fill="x", padx=4, pady=4)

            image = load_cover_image(album["cover"])
            if image is not None:
                self.album_images.append(image)
                image_label = ttk.Label(row, image=image, style="Panel.TLabel")
            else:
                image_label = ttk.Label(row, text="No\nCover", width=7, anchor="center")

            image_label.grid(row=0, column=0, rowspan=2, sticky="nw", padx=(0, 8))

            ttk.Label(row, text=album["name"], font=("TkDefaultFont", 10, "bold")).grid(
                row=0, column=1, sticky="w"
            )
            ttk.Label(row, text=album["about"], justify="left", wraplength=360).grid(
                row=1, column=1, sticky="ew"
            )

            row.columnconfigure(1, weight=1)
            self._bind_click(
                row,
                lambda event, selected=album: self._select_album(selected)
            )

    def _show_songs(self):
        self._clear_frame(self.song_list.body)

        if self.selected_album is None:
            return

        songs = self.selected_album["songs"]

        if not songs:
            ttk.Label(
                self.song_list.body,
                text="No song JSON files with an id were found."
            ).pack(anchor="w", padx=8, pady=8)
            return

        for song in songs:
            row = ttk.Frame(self.song_list.body, padding=6, relief="solid", borderwidth=1)
            row.pack(fill="x", padx=4, pady=4)

            ttk.Label(row, text=song["title"], font=("TkDefaultFont", 10, "bold")).pack(anchor="w")
            ttk.Label(row, text=song["about"], justify="left", wraplength=420).pack(
                anchor="w", fill="x", pady=(2, 0)
            )

            self._bind_click(
                row,
                lambda event, selected=song: self._select_song(selected)
            )

    def _select_album(self, album):
        self.selected_album = album
        self.selected_song = None

        # Selecting an album completely resets the URL to album-only.
        self.url_var.set(make_album_url(album["id"]))
        self.about_label.configure(text=album["about"] or album["name"])
        self._show_songs()

    def _select_song(self, song):
        if self.selected_album is None:
            return

        self.selected_song = song
        self.url_var.set(make_song_url(self.selected_album["id"], song["id"]))
        self.about_label.configure(text=song["about"] or song["title"])

    def _copy_url(self):
        url = self.url_var.get().strip()
        if not url:
            return

        self.clipboard_clear()
        self.clipboard_append(url)
        self.update()


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    app = URLBuilderApp()
    app.mainloop()
