import {loadJson, normalizeAlbumId, normalizeSongId, songPathId, getContentHost, setStatus} from "./helpers.js";
import {setMenuActive} from "./menu.js";
import {buildAlbumSection} from "./albumDetail.js";

export async function loadSingleAlbum(albumId, {albumIndex, config}){
    const normalizedAlbumId = normalizeAlbumId(albumId);
    if(!albumIndex.has(normalizedAlbumId)){
        throw new Error(`Album is not listed in AlbumsMenu.json: ${normalizedAlbumId}`);
    }

    const albumRoot = `${config.albumsRoot}/${normalizedAlbumId}`;
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

    songs.sort((a, b) => Number(a?.details?.Track ?? 9999) - Number(b?.details?.Track ?? 9999));

    return {albumId: normalizedAlbumId, albumRoot, album, songs};
}

export function findListedSongPath(album, requestedSongId){
    const requested = normalizeSongId(requestedSongId);
    if(!requested) return null;

    const paths = Array.isArray(album?.songs) ? album.songs : [];
    return paths.find(path => songPathId(path) === requested) || null;
}

export async function renderAlbum(albumId, requestedSongId, {albumIndex, config, lightbox, nextRenderToken, isRenderCurrent}){
    const normalizedAlbumId = normalizeAlbumId(albumId);
    const normalizedSongId = normalizeSongId(requestedSongId);
    const token = nextRenderToken();
    const host = getContentHost();

    host.innerHTML = "";
    setMenuActive(normalizedAlbumId);
    setStatus(config?.labels?.loading || "Loading...");

    try{
        const albumData = await loadSingleAlbum(normalizedAlbumId, {albumIndex, config});
        if(!isRenderCurrent(token)) return;

        setStatus("");
        const section = buildAlbumSection(albumData.albumId, albumData.albumRoot, albumData.album, albumData.songs, lightbox, config);
        host.appendChild(section);

        if(normalizedSongId){
            const target = albumData.songs
                .map(song => ({song, id: normalizeSongId(song?.id || song?._pathId || "")}))
                .find(entry => entry.id === normalizedSongId);

            if(target){
                const songElement = document.getElementById(`${normalizedAlbumId}--${target.id}`);
                songElement?._openSong?.();
                window.requestAnimationFrame(() => {
                    songElement?.scrollIntoView({behavior: "smooth", block: "center"});
                });
            }
        }else{
            window.requestAnimationFrame(() => {
                section.scrollIntoView({behavior: "smooth", block: "start"});
            });
        }
    }catch(error){
        if(!isRenderCurrent(token)) return;
        console.error(error);
        setStatus(config?.labels?.albumLoadError || "Album failed to load.", true);
    }
}
