import {loadHeaderFooter, HF_main, setText} from "./HeaderFooter.js";
import {loadBranch} from "./OpenJsons.js";
import {
	getURLParam,
	normalizeKey,
	archivePageUrl,
	branchPageUrl,
	loadArchiveJson,
	resolveArchiveAsset,
	addParagraphs,
	buildMeta,
	showPageError
} from "./ArchiveHelpers.js";


function createLightbox(){
	const lightbox = document.querySelector("[data-archive-lightbox]");
	const image = document.querySelector("[data-archive-lightbox-image]");
	const caption = document.querySelector("[data-archive-lightbox-caption]");
	const closeButtons = document.querySelectorAll("[data-archive-lightbox-close]");
	const prevButton = document.querySelector("[data-archive-prev]");
	const nextButton = document.querySelector("[data-archive-next]");

	if(!lightbox || !image || !caption) return null;

	let gallery = [];
	let index = 0;

	function render(){
		if(!gallery.length) return;

		const item = gallery[index];
		image.src = item.src;
		image.alt = item.alt || item.caption || "";
		caption.textContent = gallery.length > 1
			? `${item.caption || ""} (${index + 1}/${gallery.length})`
			: (item.caption || "");
	}

	function open(items, startIndex = 0){
		gallery = items;
		index = startIndex;
		render();
		lightbox.hidden = false;
		document.body.style.overflow = "hidden";
	}

	function close(){
		lightbox.hidden = true;
		image.src = "";
		document.body.style.overflow = "";
	}

	function prev(){
		if(!gallery.length) return;
		index = (index - 1 + gallery.length) % gallery.length;
		render();
	}

	function next(){
		if(!gallery.length) return;
		index = (index + 1) % gallery.length;
		render();
	}

	closeButtons.forEach(button => button.addEventListener("click", close));
	prevButton?.addEventListener("click", prev);
	nextButton?.addEventListener("click", next);

	document.addEventListener("keydown", event => {
		if(lightbox.hidden) return;
		if(event.key === "Escape") close();
		if(event.key === "ArrowLeft") prev();
		if(event.key === "ArrowRight") next();
	});

	return {open};
}


async function main(){
	await loadHeaderFooter();
	const {branch} = await HF_main();

	const archiveKey = normalizeKey(getURLParam("archive"));
	const projectKey = normalizeKey(getURLParam("project"));

	if(!archiveKey || !projectKey){
		showPageError("The archive or project key is missing.");
		return;
	}

	// Branch identity/bio still comes through the site's normal JSON system.
	const branchData = await loadBranch(branch, "ArchiveBranches");
	const branches = Array.isArray(branchData?.branches) ? branchData.branches : [];

	const archiveBranch = branches.find(item =>
		normalizeKey(item?.key) === archiveKey
	);

	if(!archiveBranch){
		showPageError("The discontinued branch for this project was not found.");
		return;
	}

	// Full project data comes from the stripped archived branch itself:
	// /Goods/Archive/<ArchiveKey>/Projects/<ProjectKey>.json
	const project = await loadArchiveJson(
		branch,
		archiveKey,
		`Projects/${projectKey}`
	);

	const breadcrumb = document.querySelector("[data-archive-breadcrumb]");
	if(breadcrumb){
		const archiveHome = document.createElement("a");
		archiveHome.href = archivePageUrl(branch);
		archiveHome.textContent = "T.Goods Archive";

		const branchLink = document.createElement("a");
		branchLink.href = branchPageUrl(branch, archiveKey);
		branchLink.textContent = archiveBranch.name || archiveBranch.key;

		breadcrumb.append(
			archiveHome,
			" > ",
			branchLink,
			" > ",
			project.name || projectKey
		);
	}

	const cover = document.querySelector("[data-project-cover]");
	const coverWrap = document.querySelector("[data-project-cover-wrap]");

	if(cover && project.cover){
		cover.src = resolveArchiveAsset(branch, archiveKey, project.cover);
		cover.alt = project.name || projectKey;
	}else if(coverWrap){
		coverWrap.hidden = true;
	}

	setText(
		document.querySelector("[data-project-branch-label]"),
		archiveBranch.name
	);
	setText(document.querySelector("[data-project-title]"), project.name);
	setText(
		document.querySelector("[data-project-summary]"),
		project.shortDescription
	);

	addParagraphs(
		document.querySelector("[data-project-description]"),
		project.description
	);

	buildMeta(
		document.querySelector("[data-project-meta]"),
		project.details
	);

	const gallery = Array.isArray(project.gallery)
		? project.gallery
			.filter(item => item?.src)
			.map(item => ({
				...item,
				src: resolveArchiveAsset(branch, archiveKey, item.src)
			}))
		: [];

	const lightbox = createLightbox();
	const host = document.querySelector("[data-project-gallery]");

	gallery.forEach((item, index) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "archive-gallery-button";

		const image = document.createElement("img");
		image.className = "archive-gallery-image";
		image.src = item.src;
		image.alt = item.alt || item.caption || "Archived project photo";

		const caption = document.createElement("span");
		caption.className = "archive-gallery-caption";
		caption.textContent = item.caption || "";

		button.append(image, caption);
		button.addEventListener("click", () => {
			lightbox?.open(gallery, index);
		});

		host?.appendChild(button);
	});
}


main().catch(err => {
	console.error(err);
	showPageError(err.message);
});
