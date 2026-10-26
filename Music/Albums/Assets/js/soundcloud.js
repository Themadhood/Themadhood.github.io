/**
 * Build SoundCloud's standard embedded player from a song's public track URL.
 *
 * Individual song JSON files only need a "soundcloud" URL. All common player
 * settings live here so adding future tracks stays simple and consistent.
 * Returns null for songs without a usable SoundCloud URL.
 */
export function buildSoundCloudPlayer(trackUrl, songTitle = "Song"){
    if(typeof trackUrl !== "string" || !trackUrl.trim()) return null;

    let url;
    try{
        url = new URL(trackUrl.trim());
        if(url.protocol !== "https:" || !["soundcloud.com", "www.soundcloud.com"].includes(url.hostname)){
            console.warn("Unsupported SoundCloud URL:", trackUrl);
            return null;
        }
    }catch(error){
        console.warn("Invalid SoundCloud URL:", trackUrl, error);
        return null;
    }

    const wrap = document.createElement("div");
    wrap.className = "showcase-soundcloud-player";
    wrap.style.margin = "16px 0";

    const iframe = document.createElement("iframe");
    iframe.title = `Listen to ${songTitle} on SoundCloud`;
    iframe.width = "100%";
    iframe.height = "166";
    iframe.style.display = "block";
    iframe.style.border = "0";
    iframe.scrolling = "no";
    iframe.loading = "lazy";
    iframe.allow = "autoplay; encrypted-media";

    // Match the options in the supplied embed; encode the song URL safely.
    const params = new URLSearchParams({
        url: url.href,
        color: "#0a2df8",
        auto_play: "false",
        hide_related: "false",
        show_comments: "true",
        show_user: "true",
        show_reposts: "false",
        show_teaser: "true"
    });
    iframe.src = `https://w.soundcloud.com/player/?${params.toString()}`;

    wrap.appendChild(iframe);
    return wrap;
}
