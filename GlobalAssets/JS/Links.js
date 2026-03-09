import { loadHeaderFooter,HF_main,setText,setFaviconFromLogo,applyBranchColors } from "./HeaderFooter.js";


function renderLinks(data){
  const page = data.pages?.links || {};
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
  const { branch, data } = await HF_main();
  applyBranchColors(data);
  setFaviconFromLogo(data);

  const page = document.body.getAttribute("data-page");
  renderLinks(data);
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
