async function loadBranch(branchId){
  const res = await fetch(`./Content/${branchId}.json`, {cache:"no-store"});
  if(!res.ok) throw new Error(`Failed to load Content/${branchId}.json`);
  return await res.json();
}
function qs(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
export function setFaviconFromLogo(data){

  const favicon = document.querySelector("[data-site-favicon]");
  const logo = data.site?.brand?.logo;

  if(favicon && logo){
    favicon.href = logo;
  }

}
export function applyBranchColors(data){
  const colors = data.site?.brand?.colors;
  if(!colors) return;

  const root = document.documentElement;

  if(colors.bg) root.style.setProperty("--bg", colors.bg);
  if(colors.text) root.style.setProperty("--text", colors.text);
  if(colors.muted) root.style.setProperty("--muted", colors.muted);
  if(colors.card) root.style.setProperty("--card", colors.card);
  if(colors.border) root.style.setProperty("--border", colors.border);
  if(colors.accent) root.style.setProperty("--accent", colors.accent);
  if(colors.accentSoft) root.style.setProperty("--accent-soft", colors.accentSoft);
  if(colors.topbar-bg) root.style.setProperty("--topbar-bg", colors.topbar-bg);
  if(colors.footer-bg) root.style.setProperty("--footer-bg", colors.footer-bg);
  if(colors.link-color) root.style.setProperty("--link-color", colors.link-color);
  if(colors.button-bg) root.style.setProperty("--button-bg", colors.button-bg);
  if(colors.button-text) root.style.setProperty("--button-text", colors.button-text);
  if(colors.hero-overlay) root.style.setProperty("--hero-overlay", colors.hero-overlay);
}
export function setText(el, txt){ if(el) el.textContent = txt ?? ""; }

function renderNav(data){
  const brandLogo = document.querySelector("[data-brand-logo]");
  const brandName = document.querySelector("[data-brand-name]");
  const nav = document.querySelector("[data-nav]");

  if(brandLogo && data.site?.brand?.logo){
    brandLogo.src = data.site.brand.logo;
    brandLogo.alt = data.site.title || "Logo";
  }
  setText(brandName, data.site?.title || "");
  
  const brandHome = document.querySelector("[data-brand-home]");
  if (brandHome) {
    brandHome.href = data.nav?.homePath || "index.html";
  }

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
  const footerLogo = document.querySelector("[data-footer-logo]");

  if (footerLogo && data.site?.brand?.logo) {
    footerLogo.src = data.site.brand.logo;
    footerLogo.alt = data.site.title || "Logo";
  }
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




export async function HF_main(){
  const branch = qs("branch") || "pequot";
  const data = await loadBranch(branch);

  document.title = data.site?.title ? `${data.site.title}` : document.title;
  const meta = document.querySelector('meta[name="description"]');
  if(meta && data.site?.metaDescription) meta.setAttribute("Content", data.site.metaDescription);

  renderNav(data);
  renderFooter(data);
  
  return {branch,data};

}

export async function loadSharedPart(targetSelector, filePath){
  const target = document.querySelector(targetSelector);
  if(!target) return;

  const response = await fetch(filePath);
  if(!response.ok){
    throw new Error(`Failed to load ${filePath}: ${response.status}`);
  }

  target.innerHTML = await response.text();
}

export async function loadHeaderFooter(){
  await loadSharedPart("#shared-header", "./GlobalAssets/HTML/Header.html");
  await loadSharedPart("#shared-footer", "./GlobalAssets/HTML/Footer.html");
}
