import { loadHeaderFooter, HF_main } from "/GlobalAssets/JS/HeaderFooter.js";

// URL behavior intentionally stays compatible with the current page:
//   ?album=ALBUM_ID
//   ?album=ALBUM_ID&song=SONG_ID
// Invalid albums fall back to Featured without breaking the page.
// Invalid songs still load the requested valid album.

const CONFIG_URL = new URL("../json/AlbumsConfig.json", import.meta.url);

let CONFIG = null;
let MENU = null;
let ALBUM_INDEX = new Map();
let LIGHTBOX = null;
let renderToken = 0;

async function loadJson(path){
    const response = await fetch(path, {cache: "no-cache"});
    if(!response.ok){
        throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return response.json();
}

function normalizeAlbumId(value){
    return String(value || "").trim().toUpperCase();
}

function normalizeSongId(value){
    return String(value || "").trim().toLowerCase();
}

function stripJsonExtension(value){
    return String(value || "").replace(/\.json$/i, "");
}

function songPathId(path){
    const file = String(path || "").split("/").pop() || "";
    return normalizeSongId(stripJsonExtension(file));
}

function buildAlbumIndex(menu){
    const index = new Map();
    const items = Array.isArray(menu?.items) ? menu.items : [];

    for(const item of items){
        if(item?.type !== "dropdown") continue;
        const albums = Array.isArray(item.albums) ? item.albums : [];

        for(const album of albums){
            const key = normalizeAlbumId(album?.key);
            if(!key || index.has(key)) continue;

            index.set(key, {
                key,
                name: String(album?.name || key).trim(),
                category: String(item?.name || "").trim()
            });
        }
    }

    return index;
}

function getRoute(){
    const params = new URLSearchParams(window.location.search);
    return {
        albumId: normalizeAlbumId(params.get("album")),
        songId: normalizeSongId(params.get("song"))
    };
}

function updateRoute({albumId = null, songId = null, push = true} = {}){
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.delete("album");
    url.searchParams.delete("song");

    if(albumId){
        url.searchParams.set("album", normalizeAlbumId(albumId));
    }
    if(albumId && songId){
        url.searchParams.set("song", normalizeSongId(songId));
    }

    if(push){
        window.history.pushState({}, "", url);
    }else{
        window.history.replaceState({}, "", url);
    }
}

function buildShareUrl(albumId, songId = null){
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("album", normalizeAlbumId(albumId));

    if(songId){
        url.searchParams.set("song", normalizeSongId(songId));
    }

    return url.toString();
}

function buildShareButton({albumId, songId = null, title = ""}){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "showcase-share-button";
    button.setAttribute("aria-label", `Share ${title || (songId ? "song" : "album")}`);
    button.title = `Share ${title || (songId ? "song" : "album")}`;

    const icon = document.createElement("span");
    icon.className = "showcase-share-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <circle cx="18" cy="5" r="2.5"></circle>
            <circle cx="6" cy="12" r="2.5"></circle>
            <circle cx="18" cy="19" r="2.5"></circle>
            <path d="M8.2 10.9 15.8 6.1M8.2 13.1l7.6 4.8"></path>
        </svg>`;

    const label = document.createElement("span");
    label.className = "showcase-share-label";
    label.textContent = "Share";

    button.append(icon, label);

    button.addEventListener("click", async event => {
        event.preventDefault();
        event.stopPropagation();

        const url = buildShareUrl(albumId, songId);
        const shareTitle = title || document.title;

        try{
            if(navigator.share){
                await navigator.share({title: shareTitle, url});
                return;
            }

            await navigator.clipboard.writeText(url);
            const original = label.textContent;
            label.textContent = "Copied!";
            window.setTimeout(() => { label.textContent = original; }, 1400);
        }catch(error){
            if(error?.name === "AbortError") return;

            try{
                const textarea = document.createElement("textarea");
                textarea.value = url;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                textarea.remove();

                const original = label.textContent;
                label.textContent = "Copied!";
                window.setTimeout(() => { label.textContent = original; }, 1400);
            }catch(copyError){
                console.warn("Share failed.", copyError);
            }
        }
    });

    return button;
}

function getImageMax(value, fallback = 280){
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
}

function addTextBlock(host, title, value){
    if(value === undefined || value === null || value === "") return;
    if(Array.isArray(value) && value.length === 0) return;

    const block = document.createElement("div");
    block.className = "showcase-block";

    if(title){
        const heading = document.createElement("h4");
        heading.textContent = title;
        block.appendChild(heading);
    }

    const lines = Array.isArray(value) ? value : [value];
    for(const line of lines){
        if(!String(line ?? "").trim()){
            const spacer = document.createElement("div");
            spacer.className = "showcase-dropdown-spacer";
            block.appendChild(spacer);
            continue;
        }

        const p = document.createElement("p");
        p.textContent = String(line);
        block.appendChild(p);
    }

    host.appendChild(block);
}

function buildMeta(details){
    if(!details || typeof details !== "object") return null;

    const entries = Object.entries(details).filter(([, value]) => {
        if(value === null || value === undefined || value === "") return false;
        if(Array.isArray(value) && value.length === 0) return false;
        return true;
    });

    if(!entries.length) return null;

    const wrap = document.createElement("div");
    wrap.className = "showcase-meta";

    for(const [key, value] of entries){
        const row = document.createElement("div");
        row.className = "showcase-meta-row";

        const left = document.createElement("div");
        left.className = "showcase-meta-key";
        left.textContent = key;

        const right = document.createElement("div");
        right.className = "showcase-meta-value";
        right.textContent = Array.isArray(value) ? value.join(", ") : String(value);

        row.append(left, right);
        wrap.appendChild(row);
    }

    return wrap;
}

function createLightbox(){
    const lightbox = document.querySelector("[data-showcase-lightbox]");
    const image = document.querySelector("[data-showcase-lightbox-image]");
    const caption = document.querySelector("[data-showcase-lightbox-caption]");
    const closeButtons = document.querySelectorAll("[data-showcase-lightbox-close]");
    const prevButton = document.querySelector("[data-showcase-prev]");
    const nextButton = document.querySelector("[data-showcase-next]");

    if(!lightbox || !image || !caption) return null;

    let gallery = [];
    let index = 0;
    let title = "";

    function render(){
        if(!gallery.length) return;
        const current = gallery[index];
        image.classList.remove("is-landscape", "is-portrait");
        image.onload = () => image.classList.add(
            image.naturalWidth > image.naturalHeight ? "is-landscape" : "is-portrait"
        );
        image.src = current.src;
        image.alt = current.alt || title;
        caption.textContent = gallery.length > 1
            ? `${title} (${index + 1}/${gallery.length})`
            : title;
    }

    function open(items, startIndex = 0, itemTitle = ""){
        gallery = items;
        index = startIndex;
        title = itemTitle;
        render();
        lightbox.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function close(){
        lightbox.hidden = true;
        image.src = "";
        document.body.style.overflow = "";
    }

    function prev(){
        if(!gallery.length) return;
        index = (index - 1 + gallery.length) % gallery.length;
        render();
    }

    function next(){
        if(!gallery.length) return;
        index = (index + 1) % gallery.length;
        render();
    }

    closeButtons.forEach(button => button.addEventListener("click", close));
    prevButton?.addEventListener("click", prev);
    nextButton?.addEventListener("click", next);

    document.addEventListener("keydown", event => {
        if(lightbox.hidden) return;
        if(event.key === "Escape") close();
        if(event.key === "ArrowLeft") prev();
        if(event.key === "ArrowRight") next();
    });

    return {open};
}

function buildCover(path, title, lightbox, max = 320){
    const media = document.createElement("div");
    media.className = "showcase-media";
    media.style.setProperty("--showcase-image-size", `${getImageMax(max, 320)}px`);

    const button = document.createElement("button");
    button.className = "showcase-image-button";
    button.type = "button";

    const image = document.createElement("img");
    image.className = "showcase-image";
    image.src = path;
    image.alt = title;
    image.addEventListener("error", () => media.hidden = true);

    button.appendChild(image);
    button.addEventListener("click", () => {
        lightbox?.open([{src: path, alt: title}], 0, title);
    });

    media.appendChild(button);
    return media;
}

function buildLyricsDropdown(lyrics){
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

function buildSong(song, albumId){
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
        iconButton.setAttribute(
            "aria-label",
            `${shouldOpen ? "Collapse" : "Expand"} ${song.title || "song"}`
        );
    }

    button.addEventListener("click", () => toggleSong());
    iconButton.addEventListener("click", () => toggleSong());

    block._openSong = () => toggleSong(true);

    header.append(button, shareButton, iconButton);
    block.append(header, body);
    return block;
}

function buildAlbumSection(albumId, albumRoot, album, songs, lightbox){
    const grid = document.createElement("div");
    grid.className = "grid album-view";
    grid.id = `album-${albumId}`;
    grid.dataset.albumId = albumId;

    const card = document.createElement("div");
    card.className = "card showcase-section";

    const inner = document.createElement("div");
    inner.className = "showcase-item-inner";

    if(album.cover){
        inner.appendChild(
            buildCover(
                `${albumRoot}/${album.cover}`,
                album.title || "Album cover",
                lightbox,
                album.imageMax || CONFIG?.imageSizes?.album
            )
        );
    }

    const content = document.createElement("div");
    content.className = "showcase-content";

    const heading = document.createElement("h2");
    heading.className = "showcase-title";

    if(album.href){
        const link = document.createElement("a");
        link.href = album.href;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = album.title || "";
        heading.appendChild(link);
    }else{
        heading.textContent = album.title || "";
    }

    const titleRow = document.createElement("div");
    titleRow.className = "showcase-title-row";
    titleRow.append(
        heading,
        buildShareButton({
            albumId,
            title: album.title || "Album"
        })
    );

    content.appendChild(titleRow);
    addTextBlock(content, "About", album.about);
    addTextBlock(content, "Body", album.body);

    const meta = buildMeta(album.details);
    if(meta) content.appendChild(meta);

    inner.appendChild(content);
    card.appendChild(inner);

    const items = document.createElement("div");
    items.className = "showcase-items";

    for(const song of songs){
        items.appendChild(buildSong(song, albumId));
    }

    card.appendChild(items);
    grid.appendChild(card);
    return grid;
}

function buildFeaturedSong(featuredSong, lightbox){
    const {album, song, albumRoot, albumId, songId} = featuredSong;

    const itemCard = document.createElement("div");
    itemCard.className = "card showcase-item";

    const inner = document.createElement("div");
    inner.className = "showcase-item-inner";

    if(album.cover){
        inner.appendChild(
            buildCover(
                `${albumRoot}/${album.cover}`,
                song.title || album.title || "Album cover",
                lightbox,
                CONFIG?.imageSizes?.featured || 180
            )
        );
    }

    const content = document.createElement("div");
    content.className = "showcase-content";

    const heading = document.createElement("h3");
    heading.className = "showcase-title";

    const link = document.createElement("a");
    link.href = `?album=${encodeURIComponent(albumId)}&song=${encodeURIComponent(songId)}`;
    link.textContent = song.title || "Song";
    link.addEventListener("click", event => {
        event.preventDefault();
        navigateToAlbum(albumId, songId);
    });

    heading.appendChild(link);
    content.appendChild(heading);
    addTextBlock(content, "About", song.about);

    const details = {...(song.details || {})};
    if(!details.Album && album.title){
        details.Album = album.title;
    }

    const meta = buildMeta(details);
    if(meta) content.appendChild(meta);

    inner.appendChild(content);
    itemCard.appendChild(inner);
    return itemCard;
}

function buildFeaturedSection(featuredSongs, lightbox){
    const grid = document.createElement("div");
    grid.className = "grid featured-view";

    const card = document.createElement("div");
    card.className = "card showcase-section";

    const heading = document.createElement("h2");
    heading.className = "showcase-title";
    heading.textContent = CONFIG?.labels?.featuredCollection || "Featured Collection";
    card.appendChild(heading);

    const items = document.createElement("div");
    items.className = "showcase-items";

    for(const featuredSong of featuredSongs){
        items.appendChild(buildFeaturedSong(featuredSong, lightbox));
    }

    card.appendChild(items);
    grid.appendChild(card);
    return grid;
}

function setStatus(message = "", isError = false){
    const status = document.querySelector("[data-albums-status]");
    if(!status) return;

    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
    status.hidden = !message;
}

function getContentHost(){
    const host = document.querySelector("[data-showcase-sections]");
    if(!host) throw new Error("Album host was not found.");
    return host;
}

function setMenuActive(albumId = null){
    document.querySelectorAll("[data-album-menu-button]").forEach(button => {
        const buttonKey = normalizeAlbumId(button.dataset.albumKey);
        const featured = button.dataset.albumView === "featured";
        const active = albumId ? buttonKey === normalizeAlbumId(albumId) : featured;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });
}

function closeMenuDropdowns(except = null){
    document.querySelectorAll(".albums-menu-dropdown[open]").forEach(dropdown => {
        if(dropdown !== except) dropdown.removeAttribute("open");
    });
}

function buildMenu(menu){
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
            button.dataset.albumView = String(item.key || "").toLowerCase() === "featured"
                ? "featured"
                : "";
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

async function loadSingleAlbum(albumId){
    const normalizedAlbumId = normalizeAlbumId(albumId);
    if(!ALBUM_INDEX.has(normalizedAlbumId)){
        throw new Error(`Album is not listed in AlbumsMenu.json: ${normalizedAlbumId}`);
    }

    const albumRoot = `${CONFIG.albumsRoot}/${normalizedAlbumId}`;
    const album = await loadJson(`${albumRoot}/Album.json`);
    const songPaths = Array.isArray(album.songs) ? album.songs : [];

    const songResults = await Promise.allSettled(
        songPaths.map(async path => {
            const song = await loadJson(`${albumRoot}/${path}`);
            song._pathId = songPathId(path);
            return song;
        })
    );

    const songs = [];
    songResults.forEach((result, index) => {
        if(result.status === "fulfilled"){
            songs.push(result.value);
        }else{
            console.warn(`Song could not be loaded: ${normalizedAlbumId}/${songPaths[index]}`, result.reason);
        }
    });

    songs.sort((a, b) =>
        Number(a?.details?.Track ?? 9999) - Number(b?.details?.Track ?? 9999)
    );

    return {
        albumId: normalizedAlbumId,
        albumRoot,
        album,
        songs
    };
}

function findListedSongPath(album, requestedSongId){
    const requested = normalizeSongId(requestedSongId);
    if(!requested) return null;

    const paths = Array.isArray(album?.songs) ? album.songs : [];
    return paths.find(path => songPathId(path) === requested) || null;
}

async function loadFeatured(){
    const featured = await loadJson(CONFIG.featuredJson);
    const selections = Array.isArray(featured?.songs) ? featured.songs : [];
    const albumCache = new Map();
    const featuredSongs = [];

    for(const selection of selections){
        if(!selection || typeof selection !== "object") continue;

        const albumId = normalizeAlbumId(selection.album);
        const requestedSongId = normalizeSongId(selection.song);

        // AlbumsMenu.json is the whitelist for the entire page, including Featured.
        if(!albumId || !requestedSongId || !ALBUM_INDEX.has(albumId)){
            console.warn(`Featured selection is not allowed by AlbumsMenu.json: ${albumId}/${requestedSongId}`);
            continue;
        }

        const albumRoot = `${CONFIG.albumsRoot}/${albumId}`;

        try{
            let album = albumCache.get(albumId);
            if(!album){
                album = await loadJson(`${albumRoot}/Album.json`);
                albumCache.set(albumId, album);
            }

            const listedSongPath = findListedSongPath(album, requestedSongId);
            if(!listedSongPath){
                console.warn(`Featured song is not listed in Album.json: ${albumId}/${requestedSongId}`);
                continue;
            }

            const song = await loadJson(`${albumRoot}/${listedSongPath}`);
            const routeSongId = normalizeSongId(song?.id || songPathId(listedSongPath));

            featuredSongs.push({
                albumId,
                songId: routeSongId,
                album,
                song,
                albumRoot
            });
        }catch(error){
            console.warn(`Featured song could not be loaded: ${albumId}/${requestedSongId}`, error);
        }
    }

    return featuredSongs;
}

async function renderFeatured(){
    const token = ++renderToken;
    const host = getContentHost();
    host.innerHTML = "";
    setMenuActive(null);
    setStatus(CONFIG?.labels?.loading || "Loading...");

    try{
        const featuredSongs = await loadFeatured();
        if(token !== renderToken) return;

        setStatus("");

        if(!featuredSongs.length){
            const card = document.createElement("div");
            card.className = "card albums-empty-card";
            card.textContent = CONFIG?.labels?.emptyFeatured || "No featured songs are currently available.";
            host.appendChild(card);
            return;
        }

        host.appendChild(buildFeaturedSection(featuredSongs, LIGHTBOX));
    }catch(error){
        if(token !== renderToken) return;
        console.error(error);
        setStatus(CONFIG?.labels?.featuredLoadError || "Featured collection could not be loaded.", true);
    }
}

async function renderAlbum(albumId, requestedSongId = null){
    const normalizedAlbumId = normalizeAlbumId(albumId);
    const normalizedSongId = normalizeSongId(requestedSongId);
    const token = ++renderToken;
    const host = getContentHost();

    host.innerHTML = "";
    setMenuActive(normalizedAlbumId);
    setStatus(CONFIG?.labels?.loading || "Loading...");

    try{
        const albumData = await loadSingleAlbum(normalizedAlbumId);
        if(token !== renderToken) return;

        setStatus("");
        const section = buildAlbumSection(
            albumData.albumId,
            albumData.albumRoot,
            albumData.album,
            albumData.songs,
            LIGHTBOX
        );
        host.appendChild(section);

        if(normalizedSongId){
            const target = albumData.songs
                .map(song => ({
                    song,
                    id: normalizeSongId(song?.id || song?._pathId || "")
                }))
                .find(entry => entry.id === normalizedSongId);

            if(target){
                const songElement = document.getElementById(`${normalizedAlbumId}--${target.id}`);
                songElement?._openSong?.();
                window.requestAnimationFrame(() => {
                    songElement?.scrollIntoView({behavior: "smooth", block: "center"});
                });
            }
            // If the song is invalid, intentionally do nothing.
            // The valid album remains loaded, matching the old URL behavior.
        }else{
            window.requestAnimationFrame(() => {
                section.scrollIntoView({behavior: "smooth", block: "start"});
            });
        }
    }catch(error){
        if(token !== renderToken) return;
        console.error(error);
        setStatus(CONFIG?.labels?.albumLoadError || "Album failed to load.", true);
    }
}

async function routeFromUrl(){
    const {albumId, songId} = getRoute();

    if(albumId && ALBUM_INDEX.has(albumId)){
        await renderAlbum(albumId, songId);
        return;
    }

    // Invalid/missing album IDs do not throw and do not rewrite the URL.
    // The page simply falls back to Featured.
    await renderFeatured();
}

function navigateToFeatured(){
    updateRoute({push: true});
    renderFeatured();
}

function navigateToAlbum(albumId, songId = null){
    const normalizedAlbumId = normalizeAlbumId(albumId);
    if(!ALBUM_INDEX.has(normalizedAlbumId)){
        renderFeatured();
        return;
    }

    updateRoute({albumId: normalizedAlbumId, songId, push: true});
    renderAlbum(normalizedAlbumId, songId);
}

async function main(){
    CONFIG = await loadJson(CONFIG_URL);
    MENU = await loadJson(CONFIG.menuJson);
    ALBUM_INDEX = buildAlbumIndex(MENU);

    const url = new URL(window.location.href);
	if(!url.searchParams.has("branch")){
		url.searchParams.set("branch", "music");
		window.history.replaceState({}, "", url);
	}

    await loadHeaderFooter();
    await HF_main();

    buildMenu(MENU);
    LIGHTBOX = createLightbox();

    window.addEventListener("popstate", () => {
        routeFromUrl();
    });

    await routeFromUrl();
}

main().catch(error => {
    console.error(error);
    const status = document.querySelector("[data-albums-status]");
    if(status){
        status.hidden = false;
        status.classList.add("is-error");
        status.textContent = error.message;
    }
});
