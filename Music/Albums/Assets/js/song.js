import {normalizeSongId, buildShareButton, addTextBlock, buildMeta} from "./helpers.js";
import {buildLyricsDropdown} from "./lyric.js";

export function buildSong(song, albumId){
    const block = document.createElement("div");
    block.className = "showcase-block showcase-dropdown";

    const routeSongId = normalizeSongId(song?.id || song?._pathId || "");
    block.id = `${albumId}--${routeSongId}`;
    block.dataset.songId = routeSongId;
    block.dataset.albumId = albumId;

    const header = document.createElement("div");
    header.className = "showcase-dropdown-header";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "showcase-dropdown-toggle";
    button.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.textContent = song.title || "Song";
    button.appendChild(label);

    const shareButton = buildShareButton({
        albumId,
        songId: routeSongId,
        title: song.title || "Song"
    });

    const iconButton = document.createElement("button");
    iconButton.type = "button";
    iconButton.className = "showcase-dropdown-icon";
    iconButton.setAttribute("aria-label", `Expand ${song.title || "song"}`);
    iconButton.textContent = "+";

    const body = document.createElement("div");
    body.className = "showcase-dropdown-body";
    body.hidden = true;

    const inner = document.createElement("div");
    inner.className = "showcase-item-inner";

    const content = document.createElement("div");
    content.className = "showcase-content";

    const heading = document.createElement("h4");
    heading.className = "showcase-title";

    if(song.href){
        const link = document.createElement("a");
        link.href = song.href;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = song.title || "";
        heading.appendChild(link);
    }else{
        heading.textContent = song.title || "";
    }

    content.appendChild(heading);
    addTextBlock(content, "About", song.about);
    addTextBlock(content, "Description", song.description);

    const meta = buildMeta(song.details);
    if(meta) content.appendChild(meta);

    content.appendChild(buildLyricsDropdown(song.lyrics || []));
    inner.appendChild(content);
    body.appendChild(inner);

    function toggleSong(forceOpen = null){
        const currentlyOpen = button.getAttribute("aria-expanded") === "true";
        const shouldOpen = forceOpen === null ? !currentlyOpen : Boolean(forceOpen);

        button.setAttribute("aria-expanded", String(shouldOpen));
        body.hidden = !shouldOpen;
        iconButton.textContent = shouldOpen ? "−" : "+";
        iconButton.setAttribute("aria-label", `${shouldOpen ? "Collapse" : "Expand"} ${song.title || "song"}`);
    }

    button.addEventListener("click", () => toggleSong());
    iconButton.addEventListener("click", () => toggleSong());

    block._openSong = () => toggleSong(true);

    header.append(button, shareButton, iconButton);
    block.append(header, body);
    return block;
}
