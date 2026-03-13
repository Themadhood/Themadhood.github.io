import { loadHeaderFooter,HF_main,setText } from "./HeaderFooter.js";
import { loadBranch} from "./OpenJsons.js";


function renderLinks(linksData){
  const page = linksData || {};
  setText(document.querySelector("[data-links-title]"), page.title || "Links");
  const host = document.querySelector("[data-links-sections]");
  if(!host) return;
  host.innerHTML = "";

  for(const sec of (page.sections || [])){
    const card = document.createElement("div");
    card.className = "card";
    const h2 = document.createElement("h2");
	h2.className = "links-section-title";
	h2.textContent = sec.title || "";
	card.appendChild(h2);

    const list = document.createElement("div");
    list.className = "list";
    const sortedLinks = [...(sec.links || [])].sort((a,b)=>{
		const nameA = normalizeText(a?.label).toLowerCase();
		const nameB = normalizeText(b?.label).toLowerCase();

		const aComingSoon = nameA.includes("coming soon");
		const bComingSoon = nameB.includes("coming soon");

		if(aComingSoon && !bComingSoon) return 1;
		if(!aComingSoon && bComingSoon) return -1;

		return nameA.localeCompare(nameB);
	});

	for(const l of sortedLinks){
		const labelText = normalizeText(l?.label);
		const isComingSoon = labelText.toLowerCase().includes("coming soon");
		const a = document.createElement("a");

		a.textContent = `- ${labelText}`;
		a.href = l.href || "#";

		if(isComingSoon){
			a.className = "links-item links-item-coming-soon";
			a.removeAttribute("href");
		}else{
			a.className = "links-item";
			if(l.href){
				a.target = "_blank";
				a.rel = "noopener";
			}
		}

		list.appendChild(a);
	}
    card.appendChild(list);
    host.appendChild(card);
  }
}


const normalizeText = (value) => String(value || "").trim();

const isBranchLink = (href, branchName) => {
	const cleanHref = normalizeText(href);
	return cleanHref.includes(`.html?branch=${branchName}`);
};

async function mergeExternalSections(linksData, currentBranch) {
  console.log("mergeExternalSections branch:", currentBranch);
  const page = linksData || {};


  const hasDuplicateLink = (links, candidateLink) => {
    const candidateLabel = normalizeText(candidateLink?.label);
    const candidateHref = normalizeText(candidateLink?.href);

    return links.some((existingLink) => {
      const existingLabel = normalizeText(existingLink?.label);
      const existingHref = normalizeText(existingLink?.href);

      return (
        existingLabel === candidateLabel &&
        existingHref === candidateHref
      );
    });
  };

  //Ensure sections exists so we can append safely
  if (!Array.isArray(page.sections)) {
    page.sections = [];
  }

  //If no external list, just return original page
  if (!Array.isArray(page.external) || page.external.length === 0) {
    return page;
  }

  for (const ext of page.external) {
    const branchName = ext?.branch;
    const wantedSections = Array.isArray(ext?.sections) ? ext.sections : [];

    if (!branchName || wantedSections.length === 0) {
      continue;
    }

    try {
      const externalLinksData = await loadBranch(branchName, "Links");
      const externalSections = Array.isArray(externalLinksData?.sections)
        ? externalLinksData.sections
        : [];

      for (const sectionName of wantedSections) {
		  const matchedSection = externalSections.find(
			(sec) => sec?.title === sectionName
		  );

		  if (!matchedSection) {
			continue;
		  }

		  const existingSection = page.sections.find(
			(sec) => sec?.title === sectionName
		  );

		  if (existingSection) {
			// Section already exists, so append only valid non-duplicate links
			if (!Array.isArray(existingSection.links)) {
			  existingSection.links = [];
			}

			for (const link of (matchedSection.links || [])) {
			  if (isBranchLink(link?.href, branchName)) {
				continue;
			  }

			  if (hasDuplicateLink(existingSection.links, link)) {
				continue;
			  }

			  existingSection.links.push(structuredClone(link));
			}
		  } else {
			// Section does not exist yet, so add the section with filtered links
			const filteredLinks = [];

			for (const link of (matchedSection.links || [])) {
			  if (isBranchLink(link?.href, branchName)) {
				continue;
			  }

			  if (hasDuplicateLink(filteredLinks, link)) {
				continue;
			  }

			  filteredLinks.push(structuredClone(link));
			}

			if (filteredLinks.length > 0) {
			  page.sections.push({
				...structuredClone(matchedSection),
				links: filteredLinks
			  });
			}
		  }
		}
    } catch (err) {
      console.warn(`Failed to load external branch "${branchName}" Links.json`, err);
    }
  }

  return page;
}


async function main() {
	await loadHeaderFooter();
	const { branch, settings } = await HF_main();

	let linksData = await loadBranch(branch, "Links");

	//Load and merge any external sections before rendering
	linksData = await mergeExternalSections(linksData, branch);
	
	//Remove links in local sections that point to the current branch
	if(Array.isArray(linksData.sections)){
		for(const sec of linksData.sections){
			if(!Array.isArray(sec.links)) continue;

			sec.links = sec.links.filter(link=>{
				return !isBranchLink(link?.href, branch);
			});
		}
	}

	//Force "Other Business Links" section to the bottom
	if (Array.isArray(linksData.sections)) {
	  const index = linksData.sections.findIndex(
		(s) => s?.title === "Other Business Links"
	  );

	  if (index !== -1) {
		const [section] = linksData.sections.splice(index, 1);
		linksData.sections.push(section);
	  }
	}

	const page = document.body.getAttribute("data-page");
	renderLinks(linksData);

	//If URL has a #hash (ex: #contact), scroll after dynamic render finishes
	if (window.location.hash) {
		const target = document.querySelector(window.location.hash);
		if (target) {
		  target.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}
}

main().catch(err=>{
  console.error(err);
  document.body.innerHTML = `<div class="container"><h1>Site failed to load</h1><p>${err.message}</p></div>`;
});
