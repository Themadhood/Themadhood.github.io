export async function loadJson(path){
    const response = await fetch(path, {cache: "no-cache"});
    if(!response.ok){
        throw new Error(`Failed to load ${path}: ${response.status}`);
    }
    return response.json();
}

export function normalizeAlbumId(value){
    return String(value || "").trim().toUpperCase();
}

export function normalizeSongId(value){
    return String(value || "").trim().toLowerCase();
}

export function stripJsonExtension(value){
    return String(value || "").replace(/\.json$/i, "");
}

export function songPathId(path){
    const file = String(path || "").split("/").pop() || "";
    return normalizeSongId(stripJsonExtension(file));
}

export function buildAlbumIndex(menu){
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

export function getRoute(){
    const params = new URLSearchParams(window.location.search);
    return {
        albumId: normalizeAlbumId(params.get("album")),
        songId: normalizeSongId(params.get("song"))
    };
}

export function updateRoute({albumId = null, songId = null, push = true} = {}){
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

export function buildShareUrl(albumId, songId = null){
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("album", normalizeAlbumId(albumId));

    if(songId){
        url.searchParams.set("song", normalizeSongId(songId));
    }

    return url.toString();
}

export function buildShareButton({albumId, songId = null, title = ""}){
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

export function getImageMax(value, fallback = 280){
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
}

export function addTextBlock(host, title, value){
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

export function buildMeta(details){
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

export function createLightbox(){
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

export function buildCover(path, title, lightbox, max = 320){
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

export function setStatus(message = "", isError = false){
    const status = document.querySelector("[data-albums-status]");
    if(!status) return;

    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
    status.hidden = !message;
}

export function getContentHost(){
    const host = document.querySelector("[data-showcase-sections]");
    if(!host) throw new Error("Album host was not found.");
    return host;
}
