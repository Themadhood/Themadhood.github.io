import {loadHeaderFooter, HF_main} from "./HeaderFooter.js";
import {loadBranch} from "./OpenJsons.js";
import {
	branchPageUrl,
	showPageError
} from "./ArchiveHelpers.js";


function buildBranchCard(branch, siteBranch){
	const link = document.createElement("a");
	link.className = "archive-branch-card";
	link.href = branchPageUrl(siteBranch, branch.key);

	if(branch.logo){
		const logoWrap = document.createElement("div");
		logoWrap.className = "archive-branch-card-logo-wrap";

		const logo = document.createElement("img");
		logo.className = "archive-branch-card-logo";
		logo.src = branch.logo;
		logo.alt = `${branch.name || branch.key} logo`;

		logoWrap.appendChild(logo);
		link.appendChild(logoWrap);
	}

	const title = document.createElement("h3");
	title.textContent = branch.name || branch.key;

	const dates = document.createElement("p");
	dates.className = "archive-branch-card-dates";
	dates.textContent = branch.activeDates || "";

	const summary = document.createElement("p");
	summary.textContent = branch.summary || (
		Array.isArray(branch.bio)
			? branch.bio[0] || ""
			: branch.bio || ""
	);

	link.append(title, dates, summary);

	if(branch.color){
		link.style.setProperty("--archive-accent", branch.color);
	}

	return link;
}


async function main(){
	await loadHeaderFooter();
	const {branch} = await HF_main();

	const data = await loadBranch(branch, "ArchiveBranches");
	const branches = Array.isArray(data?.branches) ? data.branches : [];
	const host = document.querySelector("[data-archive-branches]");

	if(!host){
		throw new Error("Archive branch host was not found.");
	}

	if(!branches.length){
		const empty = document.createElement("div");
		empty.className = "archive-project-empty";
		empty.textContent = "No discontinued branches have been added yet.";
		host.appendChild(empty);
		return;
	}

	for(const archiveBranch of branches){
		if(!archiveBranch?.key) continue;
		host.appendChild(buildBranchCard(archiveBranch, branch));
	}
}


main().catch(err => {
	console.error(err);
	showPageError(err.message);
});
