export function getURLParam(name){
	const params = new URLSearchParams(window.location.search);
	return params.get(name);
}


export function normalizeKey(value){
	return String(value || "").trim();
}


export function archivePageUrl(branch){
	return `/GlobalAssets/HTML/Archive.html?branch=${encodeURIComponent(branch)}`;
}


export function branchPageUrl(branch, archiveKey){
	return `/GlobalAssets/HTML/ArchiveBranch.html?branch=${encodeURIComponent(branch)}&archive=${encodeURIComponent(archiveKey)}`;
}


export function projectPageUrl(branch, archiveKey, projectKey){
	return `/GlobalAssets/HTML/ArchiveProject.html?branch=${encodeURIComponent(branch)}&archive=${encodeURIComponent(archiveKey)}&project=${encodeURIComponent(projectKey)}`;
}


export function archiveRoot(branch, archiveKey = ""){
	const base = `/${String(branch || "").trim()}/Archive`;

	if(!archiveKey){
		return base;
	}

	return `${base}/${normalizeKey(archiveKey)}`;
}


export async function loadArchiveJson(branch, archiveKey, path){
	let filePath = String(path || "").trim();

	if(!filePath){
		throw new Error("No archive json path was provided.");
	}

	if(!filePath.toLowerCase().endsWith(".json")){
		filePath += ".json";
	}

	const url = `${archiveRoot(branch, archiveKey)}/${filePath}`;
	const response = await fetch(url, {cache:"no-store"});

	console.log("Loaded Status:", response.status, url);

	if(!response.ok){
		throw new Error(`Failed to load ${url} (${response.status})`);
	}

	return response.json();
}


export function resolveGoodsAsset(branch, path){
	if(!path) return "";

	const value = String(path).trim();

	if(
		value.startsWith("/") ||
		/^https?:\/\//i.test(value)
	){
		return value;
	}

	return `/${String(branch || "").trim()}/${value.replace(/^\.\//, "")}`;
}


export function resolveArchiveAsset(branch, archiveKey, path){
	if(!path) return "";

	const value = String(path).trim();

	if(
		value.startsWith("/") ||
		/^https?:\/\//i.test(value)
	){
		return value;
	}

	return `${archiveRoot(branch, archiveKey)}/${value.replace(/^\.\//, "")}`;
}


export function addParagraphs(host, value){
	if(!host) return;

	host.innerHTML = "";

	const lines = Array.isArray(value) ? value : [value];

	for(const line of lines){
		if(line === undefined || line === null || String(line).trim() === ""){
			continue;
		}

		const p = document.createElement("p");
		p.textContent = String(line);
		host.appendChild(p);
	}
}


export function buildMeta(host, details){
	if(!host || !details || typeof details !== "object") return;

	host.innerHTML = "";

	for(const [key, value] of Object.entries(details)){
		if(value === undefined || value === null || value === ""){
			continue;
		}

		const row = document.createElement("div");
		row.className = "archive-meta-row";

		const keyEl = document.createElement("div");
		keyEl.className = "archive-meta-key";
		keyEl.textContent = key;

		const valueEl = document.createElement("div");
		valueEl.className = "archive-meta-value";
		valueEl.textContent = Array.isArray(value) ? value.join(", ") : String(value);

		row.append(keyEl, valueEl);
		host.appendChild(row);
	}
}


export function showPageError(message){
	const container = document.querySelector(".container");

	if(!container) return;

	container.innerHTML = "";

	const grid = document.createElement("div");
	grid.className = "grid";

	const card = document.createElement("div");
	card.className = "card";

	const heading = document.createElement("h1");
	heading.textContent = "Archive";

	const p = document.createElement("p");
	p.textContent = message;

	card.append(heading, p);
	grid.appendChild(card);
	container.appendChild(grid);
}
