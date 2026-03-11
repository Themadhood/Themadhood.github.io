async function loadJson(path){
	console.log("Loading:", path);
	const res = await fetch(path, { cache: "no-store" });
	console.log("Status:", res.status, path);

	if(!res.ok){
		throw new Error(`Failed to load ${path} (${res.status})`);
	}

	return await res.json();
}


let BRANCH_RULES_CACHE = null;


async function loadBranchRules(){
	if(BRANCH_RULES_CACHE){
		return BRANCH_RULES_CACHE;
	}

	BRANCH_RULES_CACHE = await loadJson("/GlobalAssets/Json/BranchRules.json");
	return BRANCH_RULES_CACHE;
}




function capitalizeWord(word){
	if(!word) return word;
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}


function applyBranchFolderRules(branchId, rulesData){
	let result = String(branchId || "").trim();

	const rules = Array.isArray(rulesData?.rules) ? rulesData.rules : [];

	for(const rule of rules){
		if(rule.type === "capitalize_segments"){
			const separator = rule.separator || "-";

			result = result
				.split(separator)
				.map(part => capitalizeWord(part))
				.join(separator);
		}

		if(rule.type === "replace_word"){
			const matchValue = String(rule.match || "").toLowerCase();
			const replaceValue = String(rule.replace || "");
			const parts = result.split("-");

			result = parts
				.map(part => {
					if(part.toLowerCase() === matchValue){
						return replaceValue;
					}
					return part;
				})
				.join("-");
		}
	}
	console.log("after Branch rules aplyed:",result);
	return result;
}


async function resolveBranchFolder(branchId){
	const rulesData = await loadBranchRules();
	const folderName = applyBranchFolderRules(branchId, rulesData);

	console.log("Branch resolve:", {
		branchId,
		folderName
	});

	return folderName;
}


function normalizeSplitBranch(settings, indexData, linksData){
  return {
    branchId: settings.branchId,

    site: {
      title: settings.brand?.title || "",
      tagline: settings.site?.tagline || "",
      metaDescription: settings.site?.metaDescription || "",
      brand: {
        logo: settings.brand?.logo || "",
        heroBackground: settings.brand?.background || "",
        colors: settings.brand?.colors || {}
      }
    },

    nav: settings.nav || {
      homePath: "index.html",
      items: []
    },

    footer: {
      logo: settings.brand?.logo || "",
      title: settings.brand?.title || "",
      emailLabel: "Email",
      email: settings.brand?.email || "",
      copyright: settings.brand?.copyright || "",
      line2: settings.brand?.brandContext || ""
    },

    pages: {
      home: {
        hero: indexData.hero || {
          headline: "",
          body: []
        },
        about: indexData.about || {
          title: "",
          body: []
        },
        branches: indexData.branches || {
          title: "",
          items: []
        }
      },

      links: {
        title: "Links",
        sections: linksData.sections || []
      }
    }
  };
}


export async function loadBranch(branchId){
	const folder = await resolveBranchFolder(branchId);

	const [settings, indexData, linksData] = await Promise.all([
		loadJson(`/${folder}/Settings.json`),
		loadJson(`/${folder}/Index.json`),
		loadJson(`/${folder}/Links.json`)
	]);

	console.log("Loaded all jsons");

	return normalizeSplitBranch(settings, indexData, linksData);
}












