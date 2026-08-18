import {loadHeaderFooter, HF_main} from "/GlobalAssets/JS/HeaderFooter.js";
import {loadJson, buildAlbumIndex, getRoute, updateRoute, normalizeAlbumId, createLightbox} from "./helpers.js";
import {buildMenu} from "./menu.js";
import {renderFeatured} from "./featured.js";
import {renderAlbum} from "./album.js";

// URL behavior intentionally stays compatible with the current page:
//   ?album=ALBUM_ID
//   ?album=ALBUM_ID&song=SONG_ID
// Invalid albums fall back to Featured without breaking the page.
// Invalid songs still load the requested valid album.

const CONFIG_URL = new URL("../json/Config.json", import.meta.url);

let CONFIG = null;
let MENU = null;
let ALBUM_INDEX = new Map();
let LIGHTBOX = null;
let renderToken = 0;

function nextRenderToken(){
    renderToken += 1;
    return renderToken;
}

function isRenderCurrent(token){
    return token === renderToken;
}

async function showFeatured(){
    await renderFeatured({
        config: CONFIG,
        albumIndex: ALBUM_INDEX,
        lightbox: LIGHTBOX,
        navigateToAlbum,
        nextRenderToken,
        isRenderCurrent
    });
}

async function showAlbum(albumId, songId = null){
    await renderAlbum(albumId, songId, {
        albumIndex: ALBUM_INDEX,
        config: CONFIG,
        lightbox: LIGHTBOX,
        nextRenderToken,
        isRenderCurrent
    });
}

async function routeFromUrl(){
    const {albumId, songId} = getRoute();

    if(albumId && ALBUM_INDEX.has(albumId)){
        await showAlbum(albumId, songId);
        return;
    }

    await showFeatured();
}

function navigateToFeatured(){
    updateRoute({push: true});
    showFeatured();
}

function navigateToAlbum(albumId, songId = null){
    const normalizedAlbumId = normalizeAlbumId(albumId);

    if(!ALBUM_INDEX.has(normalizedAlbumId)){
        showFeatured();
        return;
    }

    updateRoute({albumId: normalizedAlbumId, songId, push: true});
    showAlbum(normalizedAlbumId, songId);
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

    buildMenu(MENU, {navigateToFeatured, navigateToAlbum});
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
