import { loadHeaderFooter, HF_main, setText } from "./HeaderFooter.js";
import { loadBranch } from "./OpenJsons.js";



function getURLParam(name){
	const params = new URLSearchParams(window.location.search);
	return params.get(name);
}

function openItemFromURL(){
	const path = getURLParam("path") || getURLParam("item");
	if(!path) return;

	const parts = String(path)
		.split("/")
		.map(part => part.trim())
		.filter(Boolean);

	if(!parts.length) return;

	let currentPath = "";
	let lastTarget = null;

	for(const part of parts){
		currentPath = currentPath ? `${currentPath}/${part}` : part;

		const target = document.querySelector(`[data-showcase-path="${currentPath}"]`);
		if(!target) return;

		lastTarget = target;

		const dropdown = target.classList.contains("showcase-dropdown")
			? target
			: target.closest(".showcase-dropdown");

		if(dropdown){
			const button = dropdown.querySelector(".showcase-dropdown-toggle");
			if(button && button.getAttribute("aria-expanded") !== "true"){
				button.click();
			}
		}
	}

	if(lastTarget){
		lastTarget.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}
}

function getJsonFileName(){
	const fromURL = getURLParam("data-json");

	if(fromURL && fromURL.trim()){
		return fromURL.trim();
	}

	// fallback if none specified
	return "Showcase";
}

function makeSlug(text){
	return String(text || "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function getItemTargetId(section, item){
	if(item && item.id && String(item.id).trim()){
		return String(item.id).trim();
	}

	const sectionSlug = makeSlug(section?.title || "section");
	const itemSlug = makeSlug(item?.title || "item");
	return `${sectionSlug}__${itemSlug}`;
}


function getImageMax(value, fallback = 280){
	const num = Number(value);
	if(Number.isFinite(num) && num > 0){
		return num;
	}
	return fallback;
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


function normalizeGallery(item){
	const gallery = [];

	if(item.image && String(item.image).trim()){
		gallery.push({
			src: item.image,
			alt: item.title || ""
		});
	}

	if(Array.isArray(item.gallery)){
		for(const entry of item.gallery){
			if(!entry) continue;

			if(typeof entry === "string"){
				if(entry.trim()){
					gallery.push({
						src: entry,
						alt: item.title || ""
					});
				}
				continue;
			}

			if(typeof entry === "object" && entry.src){
				gallery.push({
					src: entry.src,
					alt: entry.alt || item.title || ""
				});
			}
		}
	}

	return gallery;
}


function buildMediaBlock(entry, lightbox, fallbackMax = 280){
	const gallery = normalizeGallery(entry);
	if(!gallery.length){
		return null;
	}

	const media = document.createElement("div");
	media.className = "showcase-media";

	const imageMax = getImageMax(entry.imageMax, fallbackMax);
	media.style.setProperty("--showcase-image-size", `${imageMax}px`);

	const button = document.createElement("button");
	button.className = "showcase-image-button";
	button.type = "button";

	const img = document.createElement("img");
	img.className = "showcase-image";
	img.src = gallery[0].src;
	img.alt = gallery[0].alt || entry.title || "";

	img.addEventListener("error", () => {
		media.hidden = true;
	});

	button.appendChild(img);

	button.addEventListener("click", () => {
		if(lightbox){
			lightbox.open(gallery, 0, entry.title || "");
		}
	});

	media.appendChild(button);

	if(gallery.length > 1){
		const count = document.createElement("div");
		count.className = "showcase-gallery-count";
		count.textContent = `${gallery.length} images`;
		media.appendChild(count);
	}

	return media;
}


function buildMeta(details){
	if(!details || typeof details !== "object"){
		return null;
	}

	const entries = Object.entries(details).filter(([, value]) => {
		if(value === null || value === undefined) return false;
		if(value === "") return false;
		if(Array.isArray(value) && value.length === 0) return false;
		return true;
	});

	if(!entries.length){
		return null;
	}

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

		if(Array.isArray(value)){
			right.textContent = value.join(", ");
		}else{
			right.textContent = String(value);
		}

		row.appendChild(left);
		row.appendChild(right);
		wrap.appendChild(row);
	}

	return wrap;
}


function buildTextBlock(title, value){
	if(!value) return null;

	const block = document.createElement("div");
	block.className = "showcase-block";

	const heading = document.createElement("h4");
	heading.textContent = title;
	block.appendChild(heading);

	if(Array.isArray(value)){
		for(const line of value){
			if(!String(line || "").trim()){
				const spacer = document.createElement("div");
				spacer.style.height = "10px";
				block.appendChild(spacer);
				continue;
			}

			const p = document.createElement("p");
			p.textContent = line;
			block.appendChild(p);
		}
	}else{
		const p = document.createElement("p");
		p.textContent = value;
		block.appendChild(p);
	}

	return block;
}


function createLightbox(){
	const lightbox = document.querySelector("[data-showcase-lightbox]");
	const image = document.querySelector("[data-showcase-lightbox-image]");
	const caption = document.querySelector("[data-showcase-lightbox-caption]");
	const closeButtons = document.querySelectorAll("[data-showcase-lightbox-close]");
	const prevButton = document.querySelector("[data-showcase-prev]");
	const nextButton = document.querySelector("[data-showcase-next]");

	if(!lightbox || !image || !caption){
		return null;
	}

	let currentGallery = [];
	let currentIndex = 0;
	let currentTitle = "";

	function render(){
		if(!currentGallery.length) return;

		const current = currentGallery[currentIndex];
		image.classList.remove("is-landscape", "is-portrait");

		image.onload = () => {
			if(image.naturalWidth > image.naturalHeight){
				image.classList.add("is-landscape");
			}else{
				image.classList.add("is-portrait");
			}
		};

		image.src = current.src;
		image.alt = current.alt || currentTitle || "";

		if(currentGallery.length > 1){
			caption.textContent = `${currentTitle} (${currentIndex + 1}/${currentGallery.length})`;
		}else{
			caption.textContent = currentTitle;
		}
	}

	function open(gallery, startIndex, title){
		currentGallery = Array.isArray(gallery) ? gallery : [];
		currentIndex = startIndex || 0;
		currentTitle = title || "";

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


function formatBlockTitle(key){
	if(!key) return "";

	const text = String(key).trim();
	if(!text){
		return "";
	}

	return text.charAt(0).toUpperCase() + text.slice(1);
}


function isReservedEntryKey(key){
	if(key === "title") return true;
	if(key === "href") return true;
	if(key === "image") return true;
	if(key === "imageMax") return true;
	if(key === "gallery") return true;
	if(key === "items") return true;
	if(key === "sections") return true;
	if(key === "dropdowns") return true;
	if(key === "render") return true;
	if(key === "type") return true;
	if(key === "content") return true;
	if(key === "text") return true;
	if(key === "lines") return true;
	if(key === "_hideInnerTitle") return true;
	if(key.toLowerCase() === "details") return true;

	return false;
}


function getEntryTextBlocks(entry){
	if(!entry || typeof entry !== "object"){
		return [];
	}

	const blocks = [];

	for(const [key, value] of Object.entries(entry)){
		if(isReservedEntryKey(key)){
			continue;
		}

		const isString = typeof value === "string" && value.trim();

		const isTextList =
			Array.isArray(value) &&
			value.length > 0 &&
			value.every(line => typeof line === "string");

		if(isString || isTextList){
			blocks.push({
				title: formatBlockTitle(key),
				value: value
			});
		}
	}

	return blocks;
}


function getEntryDetails(entry){
	if(!entry || typeof entry !== "object"){
		return null;
	}

	for(const [key, value] of Object.entries(entry)){
		if(key.toLowerCase() === "details" && value && typeof value === "object" && !Array.isArray(value)){
			return value;
		}
	}

	return null;
}


function buildShowcaseContent(entry, headingLevel = "h3", lightbox = null, parentPath = ""){
	const content = document.createElement("div");
	content.className = "showcase-content";

	if(!entry._hideInnerTitle){
		const heading = document.createElement(headingLevel);
		heading.className = "showcase-title";

		if(entry.href){
			const link = document.createElement("a");
			link.href = entry.href;
			link.target = "_blank";
			link.rel = "noopener";
			link.style.textDecoration = "none";
			link.style.color = "inherit";
			link.textContent = entry.title || "";
			heading.appendChild(link);
		}else{
			heading.textContent = entry.title || "";
		}

		content.appendChild(heading);
	}

	const textBlocks = getEntryTextBlocks(entry);

	for(const blockData of textBlocks){
		const block = buildTextBlock(blockData.title, blockData.value);
		if(block){
			content.appendChild(block);
		}
	}

	const meta = buildMeta(getEntryDetails(entry));
	if(meta){
		content.appendChild(meta);
	}

	const dropdownBlocks = buildDropdownBlocks(entry, lightbox, parentPath);
	for(const block of dropdownBlocks){
		content.appendChild(block);
	}

	return content;
}


function buildEntryRender(entry, lightbox, headingLevel = "h3", fallbackMax = 280, parentPath = ""){
	const wrap = document.createElement("div");
	wrap.className = "showcase-item-inner";

	if(parentPath){
		wrap.dataset.showcasePath = parentPath;
	}

	const media = buildMediaBlock(entry, lightbox, fallbackMax);
	if(media){
		wrap.appendChild(media);
	}

	const content = buildShowcaseContent(entry, headingLevel, lightbox, parentPath);
	wrap.appendChild(content);

	return wrap;
}


function buildDropdownTextBody(value){
	const body = document.createElement("div");

	const lines = Array.isArray(value)
		? value
		: [String(value || "")];

	for(const line of lines){
		if(!String(line || "").trim()){
			const spacer = document.createElement("div");
			spacer.className = "showcase-dropdown-spacer";
			body.appendChild(spacer);
			continue;
		}

		const p = document.createElement("p");
		p.textContent = line;
		body.appendChild(p);
	}

	return body;
}


function buildDropdownListBody(value){
	const ul = document.createElement("ul");
	ul.className = "showcase-dropdown-list";

	for(const item of value){
		const li = document.createElement("li");
		li.textContent = String(item || "");
		ul.appendChild(li);
	}

	return ul;
}


function buildDropdownBlock(dropdown, lightbox, parentPath = ""){
	if(!dropdown || typeof dropdown !== "object"){
		return null;
	}

	const title = String(dropdown.title || "").trim();
	if(!title){
		return null;
	}

	const renderType = String(dropdown.render || dropdown.type || "").trim().toLowerCase();

	const payload =
		dropdown.content ??
		dropdown.body ??
		dropdown.lines ??
		dropdown.text;

	const block = document.createElement("div");
	block.className = "showcase-block showcase-dropdown";

	const slug = makeSlug(dropdown.id || title);
	const currentPath = parentPath ? `${parentPath}/${slug}` : slug;
	block.dataset.showcasePath = currentPath;

	const button = document.createElement("button");
	button.type = "button";
	button.className = "showcase-dropdown-toggle";
	button.setAttribute("aria-expanded", "false");

	const buttonLabel = document.createElement("span");
	buttonLabel.textContent = title;

	const buttonIcon = document.createElement("span");
	buttonIcon.className = "showcase-dropdown-icon";
	buttonIcon.textContent = "+";

	button.appendChild(buttonLabel);
	button.appendChild(buttonIcon);

	const body = document.createElement("div");
	body.className = "showcase-dropdown-body";
	body.hidden = true;

	if(renderType === "list" && Array.isArray(payload)){
		body.appendChild(buildDropdownListBody(payload));

	}else if(renderType === "text" || payload !== undefined){
		body.appendChild(buildDropdownTextBody(payload));

	}else{
		const entryData = {
			...dropdown
		};

		const entryWrap = buildEntryRender(entryData, lightbox, "h4", 220, currentPath);
		body.appendChild(entryWrap);
	}

	button.addEventListener("click", () => {
		const isOpen = button.getAttribute("aria-expanded") === "true";
		button.setAttribute("aria-expanded", String(!isOpen));
		body.hidden = isOpen;
		buttonIcon.textContent = isOpen ? "+" : "−";
	});

	block.appendChild(button);
	block.appendChild(body);

	return block;
}


function buildDropdownBlocks(entry, lightbox, parentPath = ""){
	if(!entry || typeof entry !== "object"){
		return [];
	}

	if(!Array.isArray(entry.dropdowns)){
		return [];
	}

	const blocks = [];

	for(const dropdown of entry.dropdowns){
		const block = buildDropdownBlock(dropdown, lightbox, parentPath);
		if(block){
			blocks.push(block);
		}
	}

	return blocks;
}


function renderShowcase(showcaseData){
	const page = showcaseData || {};

	const sectionsHost = document.querySelector("[data-showcase-sections]");
	if(!sectionsHost){
		return;
	}

	sectionsHost.innerHTML = "";

	const lightbox = createLightbox();

	for(const section of (page.sections || [])){
		const grid = document.createElement("div");
		grid.className = "grid";
		grid.style.marginTop = "14px";

		const card = document.createElement("div");
		card.className = "card showcase-section";

		const sectionSlug = makeSlug(section.title);
		card.dataset.showcasePath = sectionSlug;

		card.appendChild(buildEntryRender(section, lightbox, "h2", 320, sectionSlug));

		const itemsWrap = document.createElement("div");
		itemsWrap.className = "showcase-items";

		for(const item of (section.items || [])){
			const itemCard = document.createElement("div");
			itemCard.className = "card showcase-item";

			const targetId = getItemTargetId(section, item);
			itemCard.id = targetId;
			itemCard.dataset.itemId = targetId;
			itemCard.dataset.showcasePath = targetId;

			itemCard.appendChild(buildEntryRender(item, lightbox, "h3", 280, targetId));
			itemsWrap.appendChild(itemCard);
		}
		
		card.appendChild(itemsWrap);
		grid.appendChild(card);
		sectionsHost.appendChild(grid);
	}
}


async function main(){
	await loadHeaderFooter();
	const { branch } = await HF_main();

	const jsonFile = getJsonFileName();
	const showcaseData = await loadBranch(branch, jsonFile);

	renderShowcase(showcaseData);
	openItemFromURL();
}


main().catch(err => {
	console.error(err);
	document.body.innerHTML = `<div class="container"><h1>Site failed to load</h1><p>${err.message}</p></div>`;
});