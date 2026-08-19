import {loadJson, normalizeAlbumId, normalizeSongId, buildCover, addTextBlock, buildMeta, getContentHost, setStatus} from "./helpers.js";
import {setMenuActive} from "./menu.js";
import {findListedSongPath} from "./album.js";

function buildFeaturedSong(featuredSong, lightbox, config, navigateToAlbum){
    const {album, song, albumRoot, albumId, songId} = featuredSong;

    const itemCard = document.createElement("div");
    itemCard.className = "card showcase-item";

    const inner = document.createElement("div");
    inner.className = "showcase-item-inner";

    if(album.cover){
        inner.appendChild(buildCover(`${albumRoot}/${album.cover}`, song.title || album.title || "Album cover", lightbox, config?.imageSizes?.featured || 180));
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

function buildFeaturedSection(featuredSongs, lightbox, config, navigateToAlbum){
    const grid = document.createElement("div");
    grid.className = "grid featured-view";

    const card = document.createElement("div");
    card.className = "card showcase-section";

    const heading = document.createElement("h2");
    heading.className = "showcase-title";
    heading.textContent = config?.labels?.featuredCollection || "Featured Collection";
    card.appendChild(heading);

    const items = document.createElement("div");
    items.className = "showcase-items";

    for(const featuredSong of featuredSongs){
        items.appendChild(buildFeaturedSong(featuredSong, lightbox, config, navigateToAlbum));
    }

    card.appendChild(items);
    grid.appendChild(card);
    return grid;
}

export async function loadFeatured({config, albumIndex}){
    const featured = await loadJson(config.featuredJson);
    const selections = Array.isArray(featured?.songs) ? featured.songs : [];
    const albumCache = new Map();
    const featuredSongs = [];

    for(const selection of selections){
        if(!selection || typeof selection !== "object") continue;

        const albumId = normalizeAlbumId(selection.album);
        const requestedSongId = normalizeSongId(selection.song);

        if(!albumId || !requestedSongId || !albumIndex.has(albumId)){
            console.warn(`Featured selection is not allowed by AlbumsMenu.json: ${albumId}/${requestedSongId}`);
            continue;
        }

        const albumRoot = `${config.albumsRoot}/${albumId}`;

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
            const routeSongId = normalizeSongId(song?.id || requestedSongId);

            featuredSongs.push({albumId, songId: routeSongId, album, song, albumRoot});
        }catch(error){
            console.warn(`Featured song could not be loaded: ${albumId}/${requestedSongId}`, error);
        }
    }

    return featuredSongs;
}

export async function renderFeatured({config, albumIndex, lightbox, navigateToAlbum, nextRenderToken, isRenderCurrent}){
    const token = nextRenderToken();
    const host = getContentHost();

    host.innerHTML = "";
    setMenuActive(null);
    setStatus(config?.labels?.loading || "Loading...");

    try{
        const featuredSongs = await loadFeatured({config, albumIndex});
        if(!isRenderCurrent(token)) return;

        setStatus("");

        if(!featuredSongs.length){
            const card = document.createElement("div");
            card.className = "card albums-empty-card";
            card.textContent = config?.labels?.emptyFeatured || "No featured songs are currently available.";
            host.appendChild(card);
            return;
        }

        host.appendChild(buildFeaturedSection(featuredSongs, lightbox, config, navigateToAlbum));
    }catch(error){
        if(!isRenderCurrent(token)) return;
        console.error(error);
        setStatus(config?.labels?.featuredLoadError || "Featured collection could not be loaded.", true);
    }
}
