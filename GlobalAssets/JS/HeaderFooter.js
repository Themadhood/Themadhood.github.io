import { loadBranch} from "./OpenJsons.js";


// set value functions
function qs(name){
	const url = new URL(window.location.href);
	return url.searchParams.get(name);
}


function setFaviconFromLogo(settings){
	const favicon = document.querySelector("[data-site-favicon]");
	const logo = settings.brand?.logo;

	if(favicon && logo){
		favicon.href = logo;
	}

}


function applyBranchColors(settings){
	const colors = settings.brand?.colors;
	if(!colors) return;

	const root = document.documentElement;

	if(colors.bg) root.style.setProperty("--bg", colors.bg);
	if(colors.text) root.style.setProperty("--text", colors.text);
	if(colors.muted) root.style.setProperty("--muted", colors.muted);
	if(colors.card) root.style.setProperty("--card", colors.card);
	if(colors.border) root.style.setProperty("--border", colors.border);
	if(colors.accent) root.style.setProperty("--accent", colors.accent);
	if(colors.accentSoft) root.style.setProperty("--accent-soft", colors.accentSoft);
	if(colors.topbarBg) root.style.setProperty("--topbar-bg", colors.topbarBg);
	if(colors.footerBg) root.style.setProperty("--footer-bg", colors.footerBg);
	if(colors.linkColor) root.style.setProperty("--link-color", colors.linkColor);
	if(colors.buttonBg) root.style.setProperty("--button-bg", colors.buttonBg);
	if(colors.buttonText) root.style.setProperty("--button-text", colors.buttonText);
	if(colors.heroOverlay) root.style.setProperty("--hero-overlay", colors.heroOverlay);
}


export function setText(el, txt){ if(el) el.textContent = txt ?? ""; }



// navigation
function applyNavMode() {
	const header = document.querySelector(".topbar");
	const nav = document.querySelector("[data-nav]");
	const toggle = document.querySelector("[data-nav-toggle]");

	if (!header || !nav || !toggle) {
		return;
	}

	const linkCount = nav.querySelectorAll("a").length;
	const isMobile = window.innerWidth <= 900;
	const useCollapsed = isMobile || linkCount > 4;

	header.classList.remove("nav-mode-inline", "nav-mode-collapsible");
	header.classList.add(useCollapsed ? "nav-mode-collapsible" : "nav-mode-inline");

	if (!useCollapsed) {
		nav.classList.remove("is-open");
		toggle.classList.remove("is-open");
		toggle.setAttribute("aria-expanded", "false");
	}

	updateHeaderHeight();
}

function setupNavToggle() {
	const toggle = document.querySelector("[data-nav-toggle]");
	const nav = document.querySelector("[data-nav]");

	if (!toggle || !nav) {
		return;
	}

	toggle.addEventListener("click", () => {
		const isOpen = nav.classList.contains("is-open");

		nav.classList.toggle("is-open", !isOpen);
		toggle.classList.toggle("is-open", !isOpen);
		toggle.setAttribute("aria-expanded", String(!isOpen));

		updateHeaderHeight();
	});

	for (const link of nav.querySelectorAll("a")) {
		link.addEventListener("click", () => {
			if (window.innerWidth <= 900) {
				nav.classList.remove("is-open");
				toggle.classList.remove("is-open");
				toggle.setAttribute("aria-expanded", "false");
				updateHeaderHeight();
			}
		});
	}

	window.addEventListener("resize", () => {
		applyNavMode();
	});
}











// render
function renderNav(settings){
	const brandLogo = document.querySelector("[data-brand-logo]");
	const brandName = document.querySelector("[data-brand-name]");
	const nav = document.querySelector("[data-nav]");

	//Brand logo top left of header
	if(brandLogo && settings.brand?.logo){
		brandLogo.src = settings.brand.logo;
		brandLogo.alt = settings.title || "Logo";
	}
	
	//brand name top left header right of logo
	setText(brandName, settings.brand?.title || "");
	const brandHome = document.querySelector("[data-brand-home]");
	if (brandHome) {
		brandHome.href = settings.nav?.homePath || "index.html";
	}

	//navigation on right of headder
	if(nav){
		nav.innerHTML = "";
		for(const item of (settings.nav?.items || [])){
			const a = document.createElement("a");
			a.href = item.href;
			a.textContent = item.label;
			nav.appendChild(a);
		}
	}
}



function renderFooter(settings){
	const footerLogo = document.querySelector("[data-footer-logo]");

	if (footerLogo && settings.brand?.logo) {
		footerLogo.src = settings.brand.logo;
		footerLogo.alt = settings.brand.title || "Logo";
	}
	setText(document.querySelector("[data-footer-title]"), settings.brand?.title || "");
	const emailEl = document.querySelector("[data-footer-email]");
	if(emailEl){
		const email = settings.brand?.email || "";
		emailEl.href = email ? `mailto:${email}` : "#";
		emailEl.textContent = email ? email : "";
	}
	setText(document.querySelector("[data-footer-copy]"), settings.brand?.copyright || "");
	setText(document.querySelector("[data-footer-line2]"), settings.brand?.brandContext || "");
}


//Header Hight tracker so body starts under it not behind
function updateHeaderHeight() {
    const header = document.querySelector(".topbar")
    if (!header) {
        return
    }
    document.documentElement.style.setProperty(
        "--header-height",
        `${header.offsetHeight}px`
    )
}

function watchHeaderHeight() {
    const header = document.querySelector(".topbar")

    if (!header) {
        return
    }

    updateHeaderHeight()

    const resizeObserver = new ResizeObserver(() => {
        updateHeaderHeight()
    })
    resizeObserver.observe(header)
    window.addEventListener("resize", updateHeaderHeight)
}




export async function HF_main(){
	const branch = qs("branch") || "pequot";

	const settings = await loadBranch(branch,'Settings');

	document.title = settings.brand?.title ? `${settings.brand?.title}` : document.title;
	const meta = document.querySelector('meta[name="description"]');
	if(meta && settings.site?.metaDescription) meta.setAttribute("Content", settings.site.metaDescription);

	renderNav(settings);
	setupNavToggle();
	applyNavMode();
	renderFooter(settings);

	applyBranchColors(settings);
	setFaviconFromLogo(settings);

	return {branch, settings};

}

async function loadSharedPart(targetSelector, filePath){
	const target = document.querySelector(targetSelector);
	if(!target) return;

	const response = await fetch(filePath);
	if(!response.ok){
		throw new Error(`Failed to load ${filePath}: ${response.status}`);
	}

	target.innerHTML = await response.text();
}

export async function loadHeaderFooter(){
	await loadSharedPart("#shared-header", "./GlobalAssets/HTML/Header.html");
	watchHeaderHeight()
	await loadSharedPart("#shared-footer", "./GlobalAssets/HTML/Footer.html");
}
