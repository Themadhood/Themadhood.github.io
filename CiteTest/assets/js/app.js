async function loadBranch(branchId){
  const res = await fetch(`./content/${branchId}.json`, {cache:"no-store"});
  if(!res.ok) throw new Error(`Failed to load content/${branchId}.json`);
  return await res.json();
}
function qs(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
function setText(el, txt){ if(el) el.textContent = txt ?? ""; }

function renderNav(data){
  const brandLogo = document.querySelector("[data-brand-logo]");
  const brandName = document.querySelector("[data-brand-name]");
  const nav = document.querySelector("[data-nav]");

  if(brandLogo && data.site?.brand?.logo){
    brandLogo.src = data.site.brand.logo;
    brandLogo.alt = data.site.title || "Logo";
  }
  setText(brandName, data.site?.title || "");

  if(nav){
    nav.innerHTML = "";
    for(const item of (data.nav?.items || [])){
      const a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      nav.appendChild(a);
    }
  }
}

function renderFooter(data){
  setText(document.querySelector("[data-footer-title]"), data.footer?.title || data.site?.title || "");
  const emailEl = document.querySelector("[data-footer-email]");
  if(emailEl){
    const email = data.footer?.email || "";
    emailEl.href = email ? `mailto:${email}` : "#";
    emailEl.textContent = email ? email : "";
  }
  setText(document.querySelector("[data-footer-copy]"), data.footer?.copyright || "");
  setText(document.querySelector("[data-footer-line2]"), data.footer?.line2 || "");
}

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
		    titleHTML = `
			  <h3>
			    <a href="${item.href}" class="card-link">
			      ${item.title || ""}
			    </a>
			  </h3>
			`;
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
      const img = document.createElement("img");
      img.alt = a.name || "";
      if(a.icon) img.src = a.icon;
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

      row.appendChild(img);
      row.appendChild(right);
      affHost.appendChild(row);
    }
  }

  setText(document.querySelector("[data-contact-title]"), page.contact?.title || "");
  const contactNote = document.querySelector("[data-contact-note]");
  if(contactNote) contactNote.textContent = page.contact?.note || "";
}

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
  const branch = qs("branch") || "pequot";
  const data = await loadBranch(branch);

  document.title = data.site?.title ? `${data.site.title}` : document.title;
  const meta = document.querySelector('meta[name="description"]');
  if(meta && data.site?.metaDescription) meta.setAttribute("content", data.site.metaDescription);

  renderNav(data);
  renderFooter(data);

  const page = document.body.getAttribute("data-page");
  if(page === "home") renderHome(data);
  if(page === "links") renderLinks(data);
}

main().catch(err=>{
  console.error(err);
  document.body.innerHTML = `<div class="container"><h1>Site failed to load</h1><p>${err.message}</p></div>`;
});
