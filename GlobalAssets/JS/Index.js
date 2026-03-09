import { loadHeaderFooter,HF_main,setText } from "./HeaderFooter.js";


function renderHome(data){
  const page = data.pages?.home || {};
  const heroBg = document.querySelector("[data-hero-bg]");
  if(heroBg && data.site?.brand?.heroBackground){
    heroBg.style.backgroundImage = `url("${data.site.brand.heroBackground}")`;
  }
  setText(document.querySelector("[data-hero-headline]"), page.hero?.headline || "");
  const heroBody = document.querySelector("[data-hero-body]");
  if(heroBody){
    heroBody.innerHTML = "";
    for(const p of (page.hero?.body || [])){
	  if(!p.trim()){
		const spacer = document.createElement("div");
		spacer.style.height = "12px";
		heroBody.appendChild(spacer);
		continue;
	  }

      const el = document.createElement("p");
      el.textContent = p;
      heroBody.appendChild(el);
    }
  }

  setText(document.querySelector("[data-about-title]"), page.about?.title || "");
  const aboutBody = document.querySelector("[data-about-body]");
  if(aboutBody){
    aboutBody.innerHTML = "";
    for(const p of (page.about?.body || [])){
	  if(!p.trim()){
		const spacer = document.createElement("div");
		spacer.style.height = "12px";
		aboutBody.appendChild(spacer);
		continue;
	  }

	  const el = document.createElement("p");
	  el.textContent = p;
	  aboutBody.appendChild(el);
	}
  }

  setText(document.querySelector("[data-branches-title]"), page.branches?.title || "");
  const branchesHost = document.querySelector("[data-branches]");
  if(branchesHost){
    branchesHost.innerHTML = "";
    for(const item of (page.branches?.items || [])){
      const card = document.createElement("div");
      card.className = "card branch-item";
      let img = null;

	  if (item.icon && item.icon.trim() !== "") {
	    img = document.createElement("img");
	    img.src = item.icon;
	    img.alt = item.title || "";
	  }
      const right = document.createElement("div");
      let titleHTML;
      if (item.href) {
		titleHTML = `<h3><a href="${item.href}" style="text-decoration:none;color:inherit;">${item.title || ""}</a></h3>`;
      } else {
		titleHTML = `<h3>${item.title || ""}</h3>`;
      }
      right.innerHTML = `${titleHTML}<p>${item.body || ""}</p>`;
      if(item.note){
        const b = document.createElement("div");
        b.className = "badge";
        b.textContent = item.note;
        right.appendChild(b);
      }
      if (img) {
	    card.appendChild(img);
	  }
	  card.appendChild(right);
      branchesHost.appendChild(card);
    }
  }

  setText(document.querySelector("[data-affiliates-title]"), page.affiliates?.title || "");
  const affHost = document.querySelector("[data-affiliates]");
  if(affHost){
    affHost.innerHTML = "";
    for(const a of (page.affiliates?.items || [])){
      const row = document.createElement("div");
      row.className = "card branch-item";
      let img = null;

	  if (item.icon && item.icon.trim() !== "") {
	    img = document.createElement("img");
	    img.src = item.icon;
	    img.alt = item.title || "";
	  }
      const right = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = a.name || "";
      right.appendChild(name);

      if(a.href){
        const link = document.createElement("a");
        link.href = a.href;
        link.textContent = a.href;
        link.className = "small";
        link.rel = "noopener";
        link.target = "_blank";
        right.appendChild(link);
      }
      if(a.note){
        const note = document.createElement("div");
        note.className = "badge";
        note.textContent = a.note;
        right.appendChild(note);
      }

      if (img) {
	    card.appendChild(img);
	  }
	  card.appendChild(right);
      affHost.appendChild(row);
    }
  }

  setText(document.querySelector("[data-contact-title]"), page.contact?.title || "");
  const contactNote = document.querySelector("[data-contact-note]");
  if(contactNote) contactNote.textContent = page.contact?.note || "";
}


async function main(){
  await loadHeaderFooter();
  const { branch, data } = await HF_main();
  

  const page = document.body.getAttribute("data-page");
  renderHome(data);
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
