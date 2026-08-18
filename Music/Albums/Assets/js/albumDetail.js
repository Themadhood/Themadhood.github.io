import {buildCover, buildShareButton, addTextBlock, buildMeta} from "./helpers.js";
import {buildSong} from "./song.js";

export function buildAlbumSection(albumId, albumRoot, album, songs, lightbox, config){
    const grid = document.createElement("div");
    grid.className = "grid album-view";
    grid.id = `album-${albumId}`;
    grid.dataset.albumId = albumId;

    const card = document.createElement("div");
    card.className = "card showcase-section";

    const inner = document.createElement("div");
    inner.className = "showcase-item-inner";

    if(album.cover){
        inner.appendChild(buildCover(`${albumRoot}/${album.cover}`, album.title || "Album cover", lightbox, album.imageMax || config?.imageSizes?.album));
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
    titleRow.append(heading, buildShareButton({albumId, title: album.title || "Album"}));

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
