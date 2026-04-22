#a ui that wraps lines in ""
import tkinter as TK
from tkinter import messagebox


class LineWrapperApp:
	def __init__(self, root: TK.Tk) -> None:
		self.root = root
		self.root.title("Line Wrapper")
		self.root.geometry("900x650")
		self.root.minsize(500, 250)

		self.auto_convert_var = TK.BooleanVar(value=False)

		self._build_ui()
		self._bind_shortcuts()

	def _build_ui(self) -> None:
		top_frame = TK.Frame(self.root)
		top_frame.pack(fill="x", padx=10, pady=(10, 5))

		convert_btn = TK.Button(top_frame, text="Convert Text", command=self.convert_text, height=2)
		convert_btn.pack(side="left", padx=(0, 8))

		copy_btn = TK.Button(top_frame, text="Copy Text", command=self.copy_text, height=2)
		copy_btn.pack(side="left", padx=(0, 8))

		clear_btn = TK.Button(top_frame, text="Clear", command=self.clear_text, height=2)
		clear_btn.pack(side="left", padx=(0, 8))

		auto_convert_check = TK.Checkbutton(
			top_frame,
			text="Auto convert on paste / typing",
			variable=self.auto_convert_var,
		)
		auto_convert_check.pack(side="left", padx=(10, 0))

		info_label = TK.Label(
			self.root,
			text='Removes blank lines and wraps each remaining line in double quotes with commas',
			anchor="w",
		)
		info_label.pack(fill="x", padx=10, pady=(0, 5))

		text_frame = TK.Frame(self.root)
		text_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))

		self.textbox = TK.Text(
			text_frame,
			wrap="word",
			undo=True,
			font=("Consolas", 12),
		)
		self.textbox.pack(side="left", fill="both", expand=True)

		scrollbar = TK.Scrollbar(text_frame, command=self.textbox.yview)
		scrollbar.pack(side="right", fill="y")
		self.textbox.configure(yscrollcommand=scrollbar.set)

	def _bind_shortcuts(self) -> None:
		self.textbox.bind("<Control-a>", self.select_all)
		self.textbox.bind("<Control-A>", self.select_all)

		self.textbox.bind("<Control-c>", lambda event: self._event_copy())
		self.textbox.bind("<Control-C>", lambda event: self._event_copy())
		self.textbox.bind("<Control-v>", lambda event: self._event_paste())
		self.textbox.bind("<Control-V>", lambda event: self._event_paste())
		self.textbox.bind("<Control-x>", lambda event: self._event_cut())
		self.textbox.bind("<Control-X>", lambda event: self._event_cut())

		self.textbox.bind("<KeyRelease>", self._on_text_changed)

	def select_all(self, event=None):
		self.textbox.tag_add("sel", "1.0", "end-1c")
		self.textbox.mark_set("insert", "1.0")
		self.textbox.see("insert")
		return "break"

	def _event_copy(self):
		try:
			selected_text = self.textbox.get("sel.first", "sel.last")
			self.root.clipboard_clear()
			self.root.clipboard_append(selected_text)
		except TK.TclError:
			pass
		return "break"

	def _event_cut(self):
		try:
			selected_text = self.textbox.get("sel.first", "sel.last")
			self.root.clipboard_clear()
			self.root.clipboard_append(selected_text)
			self.textbox.delete("sel.first", "sel.last")
		except TK.TclError:
			pass
		return "break"

	def _event_paste(self):
		try:
			clipboard_text = self.root.clipboard_get()
		except TK.TclError:
			return "break"

		try:
			self.textbox.delete("sel.first", "sel.last")
		except TK.TclError:
			pass

		self.textbox.insert("insert", clipboard_text)

		if self.auto_convert_var.get():
			self.root.after(1, self.convert_text)

		return "break"

	def _on_text_changed(self, event=None) -> None:
		if not self.auto_convert_var.get():
			return

		if event is not None and event.keysym in {
			"Control_L", "Control_R", "Shift_L", "Shift_R",
			"Alt_L", "Alt_R", "Caps_Lock"
		}:
			return

		self.root.after(1, self.convert_text)

	def process_text(self, text: str) -> str:
		lines = text.splitlines()

		processed_lines = []
		for line in lines:
			clean_line = line.strip()

			if not clean_line:
				continue

			# Remove trailing comma
			if clean_line.endswith(","):
				clean_line = clean_line[:-1].rstrip()

			# Remove surrounding quotes
			if len(clean_line) >= 2 and clean_line.startswith('"') and clean_line.endswith('"'):
				clean_line = clean_line[1:-1]

			processed_lines.append(f'"{clean_line}"')

		# Add commas except last
		for i in range(len(processed_lines) - 1):
			processed_lines[i] += ","

		return "\n".join(processed_lines)

	def convert_text(self) -> None:
		original_text = self.textbox.get("1.0", "end-1c")
		converted_text = self.process_text(original_text)

		if original_text == converted_text:
			return

		cursor_pos = self.textbox.index("insert")

		self.textbox.delete("1.0", "end")
		self.textbox.insert("1.0", converted_text)

		try:
			self.textbox.mark_set("insert", cursor_pos)
		except TK.TclError:
			self.textbox.mark_set("insert", "end-1c")

	def copy_text(self) -> None:
		text = self.textbox.get("1.0", "end-1c")
		if not text:
			messagebox.showinfo("Copy Text", "There is no text to copy.")
			return

		self.root.clipboard_clear()
		self.root.clipboard_append(text)

	def clear_text(self) -> None:
		self.textbox.delete("1.0", "end")


def main() -> None:
	root = TK.Tk()
	app = LineWrapperApp(root)
	root.mainloop()


if __name__ == "__main__":
	main()
