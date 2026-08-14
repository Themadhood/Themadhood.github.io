import { loadHeaderFooter, HF_main } from "/GlobalAssets/JS/HeaderFooter.js";

//	?album=ALBUM_ID
//	?album=ALBUM_ID&song=SONG_ID



const ALBUMS_ROOT = "/Music/Albums/Albums";
const ALBUMS_JSON = "/Music/Albums/Albums/Albums.json";
const FEATURED_JSON = "/Music/Albums/Assets/Featured.json";

async function loadJson(path){
    const response = await fetch(path);
    if(!response.ok){
        throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return response.json();
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
        image.onload = () => image.classList.add(image.naturalWidth > image.naturalHeight ? "is-landscape" : "is-portrait");
        image.src = current.src;
        image.alt = current.alt || title;
        caption.textContent = gallery.length > 1 ? `${title} (${index + 1}/${gallery.length})` : title;
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
    function prev(){ index = (index - 1 + gallery.length) % gallery.length; render(); }
    function next(){ index = (index + 1) % gallery.length; render(); }

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
    button.addEventListener("click", () => lightbox?.open([{src:path, alt:title}], 0, title));
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
    block.id = `${albumId}--${song.id || ""}`;
    block.dataset.songId = song.id || "";
    block.dataset.albumId = albumId;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "showcase-dropdown-toggle";
    button.setAttribute("aria-expanded", "false");
    const label = document.createElement("span");
    label.textContent = song.title || "Song";
    const icon = document.createElement("span");
    icon.className = "showcase-dropdown-icon";
    icon.textContent = "+";
    button.append(label, icon);

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

    button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!open));
        body.hidden = open;
        icon.textContent = open ? "+" : "−";
    });

    block.append(button, body);
    return block;
}


async function loadFeatured(){
    let featured;

    try{
        featured = await loadJson(FEATURED_JSON);
    }catch(error){
        console.warn("Featured.json was not loaded.", error);
        return [];
    }

    const selections = Array.isArray(featured.songs) ? featured.songs : [];
    const featuredSongs = [];

    for(const selection of selections){
        if(!selection || typeof selection !== "object") continue;

        const albumId = String(selection.album || "").trim();
        const songId = String(selection.song || "").trim();

        if(!albumId || !songId) continue;

        const albumRoot = `${ALBUMS_ROOT}/${albumId}`;

        try{
            const [album, song] = await Promise.all([
                loadJson(`${albumRoot}/Album.json`),
                loadJson(`${albumRoot}/${songId}.json`)
            ]);

            featuredSongs.push({
                albumId,
                songId,
                album,
                song,
                albumRoot
            });
        }catch(error){
            console.warn(
                `Featured song could not be loaded: ${albumId}/${songId}`,
                error
            );
        }
    }

    return featuredSongs;
}

function buildFeaturedSong(featuredSong, lightbox, currentAlbumId){
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
                280
            )
        );
    }

    const content = document.createElement("div");
    content.className = "showcase-content";

    const heading = document.createElement("h3");
    heading.className = "showcase-title";

    const link = document.createElement("a");

    link.href = `?album=${encodeURIComponent(albumId)}&song=${encodeURIComponent(song.id || songId)}`;

    link.textContent = song.title || "Song";
    heading.appendChild(link);
    content.appendChild(heading);

    addTextBlock(content, "About", song.about);
    addTextBlock(content, "Description", song.description);

    const details = {
        ...(song.details || {})
    };

    if(!details.Album && album.title){
        details.Album = album.title;
    }

    const meta = buildMeta(details);
    if(meta) content.appendChild(meta);

    inner.appendChild(content);
    itemCard.appendChild(inner);

    return itemCard;
}

function buildFeaturedSection(featuredSongs, lightbox, currentAlbumId){
    if(!featuredSongs.length) return null;

    const grid = document.createElement("div");
    grid.className = "grid";

    const card = document.createElement("div");
    card.className = "card showcase-section";

    const heading = document.createElement("h2");
    heading.className = "showcase-title";
    heading.textContent = "Featured Collection";
    card.appendChild(heading);

    const items = document.createElement("div");
    items.className = "showcase-items";

    for(const featuredSong of featuredSongs){
        items.appendChild(buildFeaturedSong(featuredSong, lightbox, currentAlbumId));
    }

    card.appendChild(items);
    grid.appendChild(card);

    return grid;
}

async function loadAlbumIndex(){
    const data = await loadJson(ALBUMS_JSON);
    const albums = Array.isArray(data.albums) ? data.albums : [];

    return albums
        .map(albumId => String(albumId || "").trim())
        .filter(Boolean);
}

function getRequestedAlbumId(){
    return new URLSearchParams(window.location.search).get("album");
}

async function loadAlbums(){
    const albumIds = await loadAlbumIndex();

    if(!albumIds.length){
        throw new Error("Albums.json does not contain any albums.");
    }

    const albums = await Promise.all(
        albumIds.map(async albumId => {
            const albumRoot = `${ALBUMS_ROOT}/${albumId}`;
            const album = await loadJson(`${albumRoot}/Album.json`);

            const songs = await Promise.all(
                (album.songs || []).map(songPath =>
                    loadJson(`${albumRoot}/${songPath}`)
                )
            );

            songs.sort(
                (a,b) =>
                    Number(a?.details?.Track ?? 9999) -
                    Number(b?.details?.Track ?? 9999)
            );

            return {
                albumId,
                albumRoot,
                album,
                songs
            };
        })
    );

    return albums;
}

function buildAlbumSection(albumId, albumRoot, album, songs, lightbox){
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.marginTop = "14px";
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
                album.imageMax
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

    content.appendChild(heading);
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

function renderAlbums(albums, featuredSongs){
    document.title = "Albums | Themadhood";

    const host = document.querySelector("[data-showcase-sections]");
    if(!host) throw new Error("Album host was not found.");

    host.innerHTML = "";

    const lightbox = createLightbox();

    const requestedAlbumId = getRequestedAlbumId();

    const featuredSection = buildFeaturedSection(
        featuredSongs,
        lightbox,
        requestedAlbumId || ""
    );

    if(featuredSection){
        host.appendChild(featuredSection);
    }

    for(const albumData of albums){
        host.appendChild(
            buildAlbumSection(
                albumData.albumId,
                albumData.albumRoot,
                albumData.album,
                albumData.songs,
                lightbox
            )
        );
    }

    const params = new URLSearchParams(window.location.search);
    const requestedSong = params.get("song");

    if(requestedAlbumId && requestedSong){
        const target = document.getElementById(
            `${requestedAlbumId}--${requestedSong}`
        );

        const toggle = target?.querySelector(
            ":scope > .showcase-dropdown-toggle"
        );

        toggle?.click();
        target?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }else if(requestedAlbumId){
        document.getElementById(`album-${requestedAlbumId}`)
            ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
    }
}

async function main(){
    const url = new URL(window.location.href);

    if(!url.searchParams.has("branch")){
        url.searchParams.set("branch", "music");
        window.history.replaceState({}, "", url);
    }

    await loadHeaderFooter();
    await HF_main();

    const [albums, featuredSongs] = await Promise.all([
        loadAlbums(),
        loadFeatured()
    ]);

    renderAlbums(albums, featuredSongs);
}

main().catch(error => {
    console.error(error);
    document.body.innerHTML = `<div class="container"><h1>Album failed to load</h1><p>${error.message}</p></div>`;
});