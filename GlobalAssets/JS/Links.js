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
    h2.textContent = sec.title || "";
    card.appendChild(h2);

    const list = document.createElement("div");
    list.className = "list";
    for(const l of (sec.links || [])){
      const a = document.createElement("a");
      a.textContent = `- ${l.label}`;
      a.href = l.href || "#";
      if(l.href){
        a.target = "_blank";
        a.rel = "noopener";
      }
      list.appendChild(a);
    }
    card.appendChild(list);
    host.appendChild(card);
  }
}

async function main(){
  await loadHeaderFooter();
  const { branch, settings } = await HF_main();
  const linksData  = await loadBranch(branch,'Links');
  

  const page = document.body.getAttribute("data-page");
  renderLinks(linksData);
  // If URL has a #hash (ex: #contact), scroll after dynamic render finishes
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
