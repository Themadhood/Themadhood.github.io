import { loadHeaderFooter, HF_main, setText } from "./HeaderFooter.js";
import { loadBranch } from "./OpenJsons.js";

const STATUS_COLOR_JSON_PATH = "/GlobalAssets/Json/StatusColor.json";

/*
Codes
	Concept → Gray
	Planning → Blue-gray
	In Progress → Blue
	Testing → Purple
	Complete → Green
	Active Development → Green
	On Hold → Orange
	Deprecated → Red

Media
	Idea → Gray
	Drafting → Blue-gray
	Producing → Blue
	Editing → Purple
	Released → Green
	On Hold → Orange
	Removed → Red

Goods (Physical / Crafts)
	Concept → Gray
	Designing → Blue-gray
	Building → Blue
	Finishing → Purple
	Available → Green
	On Hold → Orange
	Scrapped → Red

General (fallback / mixed)
	Concept → Gray
	Planning → Blue-gray
	In Progress → Blue
	Reviewing → Purple
	Complete → Green
	On Hold → Orange
	Archived → Red

What this follows
	Within each type → no duplicate colors
	Across types → same colors reused intentionally
	Colors match common meaning:
	Gray = not started
	Blue = active work
	Purple = refining
	Green = done
	Orange = paused
	Red = dead/removed
*/


function getURLParam(name){
	const params = new URLSearchParams(window.location.search);
	return params.get(name);
}

function getJsonFileName(){
	const fromURL = getURLParam("data-json");

	if(fromURL && fromURL.trim()){
		return fromURL.trim();
	}

	return "Project";
}

function normalizeKey(value){
	return String(value || "")
		.trim()
		.toLowerCase();
}

function normalizeColorName(value){
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-");
}

function isPaletteColor(value){
	const colorName = normalizeColorName(value);
	return Boolean(STATUS_COLOR_PALETTE[colorName]);
}

function buildStatusColorLookup(jsonData){
	const lookup = {};

	for(const [key, value] of Object.entries(jsonData)){
		// skip notes / sections
		if(key.startsWith("_")) continue;

		// only accept valid hex colors
		if(typeof value === "string" && value.startsWith("#")){
			lookup[key.toLowerCase()] = value;
		}
	}

	return lookup;
}

async function loadStatusColors(){
	try{
		const response = await fetch(STATUS_COLOR_JSON_PATH, { cache: "no-cache" });

		if(!response.ok){
			console.warn(`Failed to load status colors: ${response.status} ${response.statusText}`, err);
			return {};
		}

		const jsonData = await response.json();
		const lookup = buildStatusColorLookup(jsonData);

		return lookup;
	}catch(err){
		console.warn("Status color JSON failed to load.", err);
		return {};
	}
}

function getStatusColor(status, statusColorLookup){
	const fallback = {
		background: "#374151",
		text: "#ffffff",
		border: "#1f2937"
	};

	const key = normalizeKey(status);

	if(!key){
		return fallback;
	}

	return statusColorLookup[key] || fallback;
}

function applyStatusBadgeColor(badge, status, lookup){
	if(!badge) return;

	const key = String(status || "").trim().toLowerCase();
	const color = lookup[key] || "#374151";

	badge.style.backgroundColor = color;
	badge.style.color = "#ffffff";
	badge.style.borderColor = color;
}


function addParagraphs(host, lines){
	if(!host) return;

	host.innerHTML = "";

	if(Array.isArray(lines)){
		for(const p of lines){
			if(!String(p || "").trim()){
				const spacer = document.createElement("div");
				spacer.style.height = "12px";
				host.appendChild(spacer);
				continue;
			}

			const el = document.createElement("p");
			el.textContent = p;
			host.appendChild(el);
		}
		return;
	}

	if(String(lines || "").trim()){
		const el = document.createElement("p");
		el.textContent = lines;
		host.appendChild(el);
	}
}


function addList(host, items){
	if(!host) return;

	host.innerHTML = "";

	if(!Array.isArray(items) || !items.length){
		const p = document.createElement("p");
		p.textContent = "Nothing listed.";
		host.appendChild(p);
		return;
	}

	const ul = document.createElement("ul");
	ul.className = "project-list";

	for(const item of items){
		const li = document.createElement("li");

		if(typeof item === "string"){
			li.textContent = item;
		}else if(item && typeof item === "object"){
			const strong = document.createElement("strong");
			strong.textContent = item.title || item.label || "Item";
			li.appendChild(strong);

			const body = String(item.body || item.text || item.description || "").trim();
			if(body){
				const span = document.createElement("span");
				span.textContent = ` — ${body}`;
				li.appendChild(span);
			}
		}

		ul.appendChild(li);
	}

	host.appendChild(ul);
}


function normalizeGallery(items){
	const gallery = [];

	if(!Array.isArray(items)){
		return gallery;
	}

	for(const entry of items){
		if(!entry) continue;

		if(typeof entry === "string"){
			if(entry.trim()){
				gallery.push({
					src: entry,
					alt: ""
				});
			}
			continue;
		}

		if(typeof entry === "object" && entry.src){
			gallery.push({
				src: entry.src,
				alt: entry.alt || entry.title || "",
				title: entry.title || "",
				body: entry.body || ""
			});
		}
	}

	return gallery;
}


function createLightbox(){
	const lightbox = document.querySelector("[data-project-lightbox]");
	const image = document.querySelector("[data-project-lightbox-image]");
	const caption = document.querySelector("[data-project-lightbox-caption]");
	const closeButtons = document.querySelectorAll("[data-project-lightbox-close]");
	const prevButton = document.querySelector("[data-project-prev]");
	const nextButton = document.querySelector("[data-project-next]");

	if(!lightbox || !image || !caption){
		return null;
	}

	let currentGallery = [];
	let currentIndex = 0;

	function render(){
		if(!currentGallery.length) return;

		const current = currentGallery[currentIndex];
		image.src = current.src;
		image.alt = current.alt || current.title || "";

		const parts = [];
		if(current.title) parts.push(current.title);
		if(current.body) parts.push(current.body);

		caption.textContent = parts.join(" — ");
	}

	function open(gallery, startIndex = 0){
		currentGallery = Array.isArray(gallery) ? gallery : [];
		currentIndex = startIndex;

		if(!currentGallery.length){
			return;
		}

		render();
		lightbox.hidden = false;
		document.body.style.overflow = "hidden";
	}

	function close(){
		lightbox.hidden = true;
		image.src = "";
		image.alt = "";
		caption.textContent = "";
		document.body.style.overflow = "";
	}

	function prev(){
		if(!currentGallery.length) return;
		currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
		render();
	}

	function next(){
		if(!currentGallery.length) return;
		currentIndex = (currentIndex + 1) % currentGallery.length;
		render();
	}

	for(const button of closeButtons){
		button.addEventListener("click", close);
	}

	if(prevButton){
		prevButton.addEventListener("click", prev);
	}

	if(nextButton){
		nextButton.addEventListener("click", next);
	}

	document.addEventListener("keydown", event => {
		if(lightbox.hidden) return;

		if(event.key === "Escape") close();
		if(event.key === "ArrowLeft") prev();
		if(event.key === "ArrowRight") next();
	});

	return { open };
}


function renderHeroMedia(project, settings){
	const host = document.querySelector("[data-project-hero-media]");
	if(!host) return;

	host.innerHTML = "";

	const imageSrc =
		project.heroImage ||
		project.image ||
		settings?.brand?.logo ||
		"";

	if(!imageSrc){
		host.hidden = true;
		return;
	}

	const img = document.createElement("img");
	img.className = "project-hero-image";
	img.src = imageSrc;
	img.alt = project.title || "Project image";

	host.appendChild(img);
}


function renderPrimaryLinks(project){
	const host = document.querySelector("[data-project-primary-links]");
	if(!host) return;

	host.innerHTML = "";

	const links = Array.isArray(project.primaryLinks) ? project.primaryLinks : [];

	for(const linkData of links){
		if(!linkData || !linkData.href) continue;

		const a = document.createElement("a");
		a.className = "project-button";
		a.href = linkData.href;
		a.textContent = linkData.title || linkData.label || "Open";
		a.target = linkData.newTab === false ? "_self" : "_blank";
		a.rel = "noopener";
		host.appendChild(a);
	}
}


function renderStatus(project, statusColorLookup){
	const badgeWrap = document.querySelector("[data-project-status-row]");
	const badge = document.querySelector("[data-project-status]");
	const host = document.querySelector("[data-project-status-details]");

	if(badgeWrap){
		if(project.status){
			badgeWrap.hidden = false;
			badge.textContent = project.status;
			applyStatusBadgeColor(badge, project.status, statusColorLookup);
		}else{
			badgeWrap.hidden = true;
		}
	}

	if(!host) return;

	host.innerHTML = "";

	if(Array.isArray(project.statusDetails) && project.statusDetails.length){
		addList(host, project.statusDetails);
		return;
	}

	if(project.statusBody){
		addParagraphs(host, project.statusBody);
		return;
	}

	if(project.status){
		const p = document.createElement("p");
		p.textContent = project.status;
		host.appendChild(p);
		return;
	}

	const p = document.createElement("p");
	p.textContent = "No status listed.";
	host.appendChild(p);
}


function renderScreenshots(project, lightbox){
	const host = document.querySelector("[data-project-screenshots]");
	if(!host) return;

	host.innerHTML = "";

	const gallery = normalizeGallery(project.screenshots);

	if(!gallery.length){
		const p = document.createElement("p");
		p.textContent = "No screenshots added.";
		host.appendChild(p);
		return;
	}

	for(const [index, shot] of gallery.entries()){
		const button = document.createElement("button");
		button.className = "project-shot-button";
		button.type = "button";

		const img = document.createElement("img");
		img.className = "project-shot-image";
		img.src = shot.src;
		img.alt = shot.alt || shot.title || `Screenshot ${index + 1}`;

		button.appendChild(img);

		button.addEventListener("click", () => {
			if(lightbox){
				lightbox.open(gallery, index);
			}
		});

		host.appendChild(button);
	}
}


function renderDownloadLinks(project){
	const wrap = document.querySelector("[data-project-downloads-wrap]");
	const host = document.querySelector("[data-project-downloads]");

	if(!wrap || !host) return;

	host.innerHTML = "";

	const links = Array.isArray(project.downloadLinks) ? project.downloadLinks : [];

	if(!links.length){
		wrap.hidden = true;
		return;
	}

	wrap.hidden = false;

	for(const linkData of links){
		if(!linkData || !linkData.href) continue;

		const row = document.createElement("div");
		row.className = "project-link-row";

		const left = document.createElement("div");
		left.className = "project-link-copy";

		const title = document.createElement("h3");
		title.textContent = linkData.title || linkData.label || "Download";

		left.appendChild(title);

		if(linkData.body){
			const p = document.createElement("p");
			p.textContent = linkData.body;
			left.appendChild(p);
		}

		if(linkData.note){
			const note = document.createElement("div");
			note.className = "project-note";
			note.textContent = linkData.note;
			left.appendChild(note);
		}

		const right = document.createElement("div");

		const a = document.createElement("a");
		a.className = "project-button";
		a.href = linkData.href;
		a.textContent = linkData.buttonText || "Open";
		a.target = linkData.newTab === false ? "_self" : "_blank";
		a.rel = "noopener";

		right.appendChild(a);

		row.appendChild(left);
		row.appendChild(right);
		host.appendChild(row);
	}
}


function renderDocumentation(project){
	const wrap = document.querySelector("[data-project-docs-wrap]");
	const host = document.querySelector("[data-project-docs]");

	if(!wrap || !host) return;

	host.innerHTML = "";

	const docs = project.documentation || {};
	const sections = [
		{ title: "How it works", value: docs.howItWorks },
		{ title: "Setup / install", value: docs.setupInstall },
		{ title: "API / structure", value: docs.apiStructure }
	].filter(section => section.value && (Array.isArray(section.value) ? section.value.length : String(section.value).trim()));

	if(!sections.length){
		wrap.hidden = true;
		return;
	}

	wrap.hidden = false;

	for(const section of sections){
		const block = document.createElement("div");
		block.className = "project-doc-block";

		const heading = document.createElement("h3");
		heading.textContent = section.title;
		block.appendChild(heading);

		addParagraphs(block, section.value);
		host.appendChild(block);
	}
}


function renderDevLogs(project){
	const wrap = document.querySelector("[data-project-devlogs-wrap]");
	const host = document.querySelector("[data-project-devlogs]");

	if(!wrap || !host) return;

	host.innerHTML = "";

	const logs = Array.isArray(project.devLogs) ? project.devLogs : [];

	if(!logs.length){
		wrap.hidden = true;
		return;
	}

	wrap.hidden = false;

	for(const log of logs){
		const block = document.createElement("div");
		block.className = "project-log-block";

		const heading = document.createElement("h3");
		heading.textContent = log.title || log.date || "Log Entry";
		block.appendChild(heading);

		if(log.date){
			const small = document.createElement("div");
			small.className = "project-log-date";
			small.textContent = log.date;
			block.appendChild(small);
		}

		if(log.progressNotes){
			addParagraphs(block, log.progressNotes);
		}else if(log.body){
			addParagraphs(block, log.body);
		}

		host.appendChild(block);
	}
}


function setupAccordions(){
	const toggles = document.querySelectorAll("[data-accordion-toggle]");

	for(const button of toggles){
		button.addEventListener("click", () => {
			const name = button.getAttribute("data-accordion-toggle");
			const body = document.querySelector(`[data-accordion-body="${name}"]`);
			const icon = button.querySelector(".project-accordion-icon");

			if(!body) return;

			const isHidden = body.hidden;
			body.hidden = !isHidden;
			button.setAttribute("aria-expanded", String(isHidden));

			if(icon){
				icon.textContent = isHidden ? "−" : "+";
			}
		});
	}
}


function renderProject(projectData, settings, statusColorLookup){
	const project = projectData || {};

	setText(document.querySelector("[data-project-title]"), project.title || "");
	setText(document.querySelector("[data-project-subtitle]"), project.subtitle || project.tagline || "");

	renderHeroMedia(project, settings);
	renderPrimaryLinks(project);

	addList(document.querySelector("[data-project-description]"), project.description || []);
	addList(document.querySelector("[data-project-features]"), project.features || []);

	renderStatus(project, statusColorLookup);
}


async function main(){
	await loadHeaderFooter();
	const { branch, settings } = await HF_main();

	const jsonFile = getJsonFileName();

	const [projectData, statusColorLookup] = await Promise.all([
		loadBranch(branch, jsonFile),
		loadStatusColors()
	]);

	const lightbox = createLightbox();

	renderProject(projectData, settings, statusColorLookup);
	renderScreenshots(projectData, lightbox);
	renderDownloadLinks(projectData);
	renderDocumentation(projectData);
	renderDevLogs(projectData);
	setupAccordions();
}


main().catch(err => {
	console.error(err);
	document.body.innerHTML = `<div class="container"><h1>Site failed to load</h1><p>${err.message}</p></div>`;
});



/*
Codes
	Concept → Gray
	Planning → Blue-gray
	In Progress → Blue
	Testing → Purple
	Complete → Green
	On Hold → Orange
	Deprecated → Red

Media
	Idea → Gray
	Drafting → Blue-gray
	Producing → Blue
	Editing → Purple
	Released → Green
	On Hold → Orange
	Removed → Red

Goods (Physical / Crafts)
	Concept → Gray
	Designing → Blue-gray
	Building → Blue
	Finishing → Purple
	Available → Green
	On Hold → Orange
	Scrapped → Red

General (fallback / mixed)
	Concept → Gray
	Planning → Blue-gray
	In Progress → Blue
	Reviewing → Purple
	Complete → Green
	On Hold → Orange
	Archived → Red

What this follows
	Within each type → no duplicate colors
	Across types → same colors reused intentionally
	Colors match common meaning:
	Gray = not started
	Blue = active work
	Purple = refining
	Green = done
	Orange = paused
	Red = dead/removed
*/


