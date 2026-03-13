async function loadJson(path){
	const res = await fetch(path, { cache: "no-store" });
	console.log("Loaded Status:", res.status, path);

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
	//console.log("after Branch rules aplyed:",result);
	return result;
}


async function resolveBranchFolder(branchId){
	const rulesData = await loadBranchRules();
	const folderName = applyBranchFolderRules(branchId, rulesData);

	/*console.log("Branch resolve:", {
		branchId,
		folderName
	});*/

	return folderName;
}




export async function loadBranch(branchId, json){
	const folder = await resolveBranchFolder(branchId);

	let fileName = String(json || "").trim();

	if(!fileName){
		throw new Error("No json file name was provided.");
	}

	if(!fileName.toLowerCase().endsWith(".json")){
		fileName += ".json";
	}

	const jsonData = await loadJson(`/${folder}/${fileName}`);

	console.log(`Loaded ${fileName}`);

	return jsonData;
}












