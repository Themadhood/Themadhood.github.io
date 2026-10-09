// Shared business-card QR generation. Each branch uses its own Settings.json.
export function getBusinessCardURL(branch){
    // Use the actual site's origin, never a hardcoded domain or local page path.
    const origin = window.location.origin;
    const slug = String(branch || "pequot").trim().replace(/^\\/+|\\/+$/g, "");
    if(!/^[A-Za-z0-9_-]+$/.test(slug)){
        throw new Error("Invalid branch name for the QR URL");
    }
    // Repository routes are capitalized; branch IDs in settings are lowercase.
    const branchPath = slug.charAt(0).toUpperCase() + slug.slice(1);
    return `${origin}/${encodeURIComponent(branchPath)}/BizCard`;
}

function validColor(value, fallback){
    if(typeof value !== "string") return fallback;
    // RGB hex only: opaque QR backgrounds and foreground ensure predictable scanning.
    return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value) ? value : fallback;
}

export async function renderCardQR(branch, settings){
    const wrap = document.querySelector("[data-card-qr]");
    const link = document.querySelector("[data-card-qr-link]");
    if(!wrap) return;

    const url = getBusinessCardURL(settings?.branchId || branch);
    const background = validColor(settings?.brand?.colors?.qrBackground, "#ffffff");
    const accent = validColor(settings?.brand?.colors?.accent, "#ffffff");

    // Accent is the outer frame; configurable qrBackground is the actual light QR field.
    wrap.style.setProperty("--qr-accent", accent);
    wrap.style.setProperty("--qr-background", background);
    if(link){
        link.href = url;
        link.textContent = url;
    }

    try{
        // qrcodejs is included locally so the card works without a third-party QR API.
        const QRCode = await import("/GlobalAssets/JS/vendor/qrcode.min.js");
        wrap.replaceChildren();
        const qr = QRCode.default || QRCode;
        const svg = qr.generateSVG(url, {
            ecclevel: "M",
            margin: 4,
            modulesize: 5,
            color: "#000000",
            background
        });
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", `QR code linking to ${url}`);
        svg.setAttribute("width", "220");
        svg.setAttribute("height", "220");
        wrap.appendChild(svg);
    }catch(error){
        console.error("Unable to generate business-card QR code", error);
        wrap.replaceChildren();
        const message = document.createElement("p");
        message.textContent = "QR code unavailable. Use the link below.";
        wrap.appendChild(message);
    }
}
