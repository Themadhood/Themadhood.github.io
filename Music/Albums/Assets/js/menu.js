import {normalizeAlbumId} from "./helpers.js";

export function setMenuActive(albumId = null){
    document.querySelectorAll("[data-album-menu-button]").forEach(button => {
        const buttonKey = normalizeAlbumId(button.dataset.albumKey);
        const featured = button.dataset.albumView === "featured";
        const active = albumId ? buttonKey === normalizeAlbumId(albumId) : featured;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });
}

export function closeMenuDropdowns(except = null){
    document.querySelectorAll(".albums-menu-dropdown[open]").forEach(dropdown => {
        if(dropdown !== except) dropdown.removeAttribute("open");
    });
}

export function buildMenu(menu, {navigateToFeatured, navigateToAlbum}){
    const host = document.querySelector("[data-albums-menu]");
    if(!host) throw new Error("Albums menu host was not found.");

    host.innerHTML = "";

    const items = Array.isArray(menu?.items) ? menu.items : [];

    for(const item of items){
        if(item?.type === "button"){
            const button = document.createElement("button");
            button.type = "button";
            button.className = "albums-menu-button";
            button.dataset.albumMenuButton = "";
            button.dataset.albumView = String(item.key || "").toLowerCase() === "featured" ? "featured" : "";
            button.textContent = item.name || "Featured";
            button.addEventListener("click", () => {
                closeMenuDropdowns();
                navigateToFeatured();
            });
            host.appendChild(button);
            continue;
        }

        if(item?.type !== "dropdown") continue;

        const details = document.createElement("details");
        details.className = "albums-menu-dropdown";

        const summary = document.createElement("summary");
        summary.textContent = item.name || "Albums";
        details.appendChild(summary);

        const body = document.createElement("div");
        body.className = "albums-menu-dropdown-body";

        const albums = Array.isArray(item.albums) ? item.albums : [];
        if(!albums.length){
            const empty = document.createElement("div");
            empty.className = "albums-menu-empty";
            empty.textContent = "No albums yet";
            body.appendChild(empty);
        }

        for(const album of albums){
            const key = normalizeAlbumId(album?.key);
            if(!key) continue;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "albums-menu-album";
            button.dataset.albumMenuButton = "";
            button.dataset.albumKey = key;
            button.textContent = album.name || key;
            button.addEventListener("click", () => {
                details.removeAttribute("open");
                navigateToAlbum(key);
            });
            body.appendChild(button);
        }

        details.addEventListener("toggle", () => {
            if(details.open) closeMenuDropdowns(details);
        });

        details.appendChild(body);
        host.appendChild(details);
    }
}
