import { loadHeaderFooter, HF_main } from "/GlobalAssets/JS/HeaderFooter.js";
import { loadBranch } from "/GlobalAssets/JS/OpenJsons.js";

function renderHeadshot(settings){
	const headshot = document.querySelector("[data-card-headshot]");
	const src = settings.brand?.logo || "";

	if(!headshot || !src){
		return;
	}

	headshot.src = src;
	headshot.alt = `${settings.brand?.title || "Profile"} headshot`;
}

function renderCardBanner(settings){
	const banner = document.querySelector(".business-card-banner");
	const bannerSrc = settings.brand?.background || "";

	if(!banner || !bannerSrc){
		return;
	}

	banner.style.backgroundImage = `url("${bannerSrc}")`;
}

function setText(selector, value){
	const el = document.querySelector(selector);
	if(el){
		el.textContent = value ?? "";
	}
}

function renderTagline(lines){
	const wrap = document.querySelector("[data-card-tagline]");
	if(!wrap){
		return;
	}

	wrap.innerHTML = "";
	for(const line of (lines || [])){
		if(!line?.trim()){
			continue;
		}

		const p = document.createElement("p");
		p.textContent = line;
		wrap.appendChild(p);
	}
}

function renderActions(actions){
	const wrap = document.querySelector("[data-card-actions]");
	if(!wrap){
		return;
	}

	wrap.innerHTML = "";
	for(const action of (actions || [])){
		const a = document.createElement("a");
		a.className = "action-button";
		a.href = action.href || "#";
		a.textContent = action.label || "Open";

		if(action.newTab){
			a.target = "_blank";
			a.rel = "noopener noreferrer";
		}

		wrap.appendChild(a);
	}
}

function renderMeta(meta){
	const wrap = document.querySelector("[data-card-meta]");
	if(!wrap){
		return;
	}

	wrap.innerHTML = "";
	for(const item of (meta || [])){
		if(item.href){
			const a = document.createElement("a");
			a.href = item.href;
			a.textContent = item.label || "";
			if(item.newTab){
				a.target = "_blank";
				a.rel = "noopener noreferrer";
			}
			wrap.appendChild(a);
			continue;
		}

		const span = document.createElement("span");
		span.textContent = item.label || "";
		wrap.appendChild(span);
	}
}

function renderBusinessCard(cardData, settings){
	const page = cardData || {};

	renderHeadshot(settings);
	renderCardBanner(settings);
	setText("[data-card-eyebrow]", page.eyebrow || "");
	setText("[data-card-title]", page.title || settings.brand?.title || "");
	setText("[data-card-subtitle]", page.subtitle || "");
	renderTagline(page.tagline || []);
	renderActions(page.actions || []);
	renderMeta(page.meta || []);
}

async function main(){
	await loadHeaderFooter();
	const {branch, settings } = await HF_main();
	const cardData = await loadBranch(branch,"BusinessCard");

	renderBusinessCard(cardData, settings);
}

main().catch(err=>{
	console.error(err);
	document.body.innerHTML = `<div class="container"><h1>Site failed to load</h1><p>${err.message}</p></div>`;
});
