export function buildLyricsDropdown(lyrics){
    const block = document.createElement("div");
    block.className = "showcase-block showcase-dropdown";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "showcase-dropdown-toggle";
    button.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.textContent = "Lyrics";

    const icon = document.createElement("span");
    icon.className = "showcase-dropdown-icon";
    icon.textContent = "+";

    button.append(label, icon);

    const body = document.createElement("div");
    body.className = "showcase-dropdown-body";
    body.hidden = true;

    for(const line of (lyrics || [])){
        if(!String(line ?? "").trim()){
            const spacer = document.createElement("div");
            spacer.className = "showcase-dropdown-spacer";
            body.appendChild(spacer);
        }else{
            const p = document.createElement("p");
            p.textContent = String(line);
            body.appendChild(p);
        }
    }

    button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!open));
        body.hidden = open;
        icon.textContent = open ? "+" : "−";
    });

    block.append(button, body);
    return block;
}
