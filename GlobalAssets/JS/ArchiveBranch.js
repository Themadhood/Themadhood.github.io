import {loadHeaderFooter, HF_main, setText} from "./HeaderFooter.js";
import {loadBranch} from "./OpenJsons.js";
import {
	getURLParam,
	normalizeKey,
	archivePageUrl,
	projectPageUrl,
	loadArchiveJson,
	resolveGoodsAsset,
	resolveArchiveAsset,
	addParagraphs,
	showPageError
} from "./ArchiveHelpers.js";


async function main(){
	await loadHeaderFooter();
	const {branch} = await HF_main();

	const archiveKey = normalizeKey(getURLParam("archive"));

	if(!archiveKey){
		showPageError("No archive branch was selected.");
		return;
	}

	// This stays in the normal branch JSON system, just like Showcase.
	const branchData = await loadBranch(branch, "ArchiveBranches");
	const branches = Array.isArray(branchData?.branches) ? branchData.branches : [];

	const archiveBranch = branches.find(item =>
		normalizeKey(item?.key) === archiveKey
	);

	if(!archiveBranch){
		showPageError("This discontinued branch was not found.");
		return;
	}

	const breadcrumb = document.querySelector("[data-archive-breadcrumb]");
	if(breadcrumb){
		const home = document.createElement("a");
		home.href = archivePageUrl(branch);
		home.textContent = "T.Goods Archive";

		breadcrumb.append(home, " > ", archiveBranch.name || archiveBranch.key);
	}

	const hero = document.querySelector("[data-archive-branch-hero]");
	if(hero && archiveBranch.color){
		hero.style.setProperty("--archive-accent", archiveBranch.color);
	}

	const logo = document.querySelector("[data-archive-logo]");
	const logoWrap = document.querySelector("[data-archive-logo-wrap]");

	if(logo && archiveBranch.logo){
		// ArchiveBranches.json is stored under Goods/Assets/JSONs,
		// so its relative paths are Goods-root paths.
		logo.src = resolveGoodsAsset(branch, archiveBranch.logo);
		logo.alt = `${archiveBranch.name || archiveBranch.key} logo`;
	}else if(logoWrap){
		logoWrap.hidden = true;
	}

	setText(document.querySelector("[data-archive-title]"), archiveBranch.name);
	setText(document.querySelector("[data-archive-dates]"), archiveBranch.activeDates);
	addParagraphs(document.querySelector("[data-archive-bio]"), archiveBranch.bio);

	// From here down, the discontinued branch is intentionally self-contained:
	// /Goods/Archive/<ArchiveKey>/Projects.json
	const projectIndex = await loadArchiveJson(
		branch,
		archiveKey,
		"Projects"
	);

	const projects = Array.isArray(projectIndex?.projects)
		? projectIndex.projects
		: [];

	const host = document.querySelector("[data-archive-projects]");

	if(!projects.length){
		const empty = document.createElement("div");
		empty.className = "archive-project-empty";
		empty.textContent = "No archived projects have been added yet.";
		host?.appendChild(empty);
		return;
	}

	for(const project of projects){
		if(!project?.key) continue;

		const link = document.createElement("a");
		link.className = "archive-project-card";
		link.href = projectPageUrl(branch, archiveKey, project.key);

		if(project.cover){
			const image = document.createElement("img");
			image.className = "archive-project-thumb";
			image.src = resolveArchiveAsset(branch, archiveKey, project.cover);
			image.alt = project.name || project.key;
			link.appendChild(image);
		}

		const title = document.createElement("h3");
		title.textContent = project.name || project.key;

		const description = document.createElement("p");
		description.textContent = project.shortDescription || "";

		link.append(title, description);
		host?.appendChild(link);
	}
}


main().catch(err => {
	console.error(err);
	showPageError(err.message);
});
