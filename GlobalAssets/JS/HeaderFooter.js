async function loadJson(path){
  console.log("Loading:", path);
  const res = await fetch(path, { cache: "no-store" });
  console.log("Status:", res.status, path);
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
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

async function loadBranch(branchId){
  const cap = branchId.charAt(0).toUpperCase() + branchId.slice(1);

  
	//new branch check
    //const res = await fetch(`./${cap}/Settings.json`, {cache:"no-store"});
    //if(!res.ok) throw new Error();

    //const data = await res.json();
    //return data;
	
  const [settings, indexData, linksData] = await Promise.all([
    loadJson(`./${cap}/Settings.json`),
    loadJson(`./${cap}/Index.json`),
    loadJson(`./${cap}/Links.json`)
  ]);
  console.log("Loaded all jsons");

  if(!res.ok) throw new Error(`Failed to load ./${cap}/`);

  return normalizeSplitBranch(settings, indexData, linksData);

  
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
  if(colors.topbarBg) root.style.setProperty("--topbar-bg", colors.topbarBg);
  if(colors.footerBg) root.style.setProperty("--footer-bg", colors.footerBg);
  if(colors.linkColor) root.style.setProperty("--link-color", colors.linkColor);
  if(colors.buttonBg) root.style.setProperty("--button-bg", colors.buttonBg);
  if(colors.buttonText) root.style.setProperty("--button-text", colors.buttonText);
  if(colors.heroOverlay) root.style.setProperty("--hero-overlay", colors.heroOverlay);
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
  
  applyBranchColors(data);
  setFaviconFromLogo(data);
  
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
async function loadJson(path){
  console.log("Loading:", path);
  const res = await fetch(path, { cache: "no-store" });
  console.log("Status:", res.status, path);
  if(!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
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

async function loadBranch(branchId){
  const cap = branchId.charAt(0).toUpperCase() + branchId.slice(1);

  try{
	//new branch check
    //const res = await fetch(`./${cap}/Settings.json`, {cache:"no-store"});
    //if(!res.ok) throw new Error();

    //const data = await res.json();
    //return data;
	
	const [settings, indexData, linksData] = await Promise.all([
      loadJson(`./${cap}/Settings.json`),
      loadJson(`./${cap}/Index.json`),
      loadJson(`./${cap}/Links.json`)
    ]);
	console.log("Loaded all jsons");

    return normalizeSplitBranch(settings, indexData, linksData);

  }catch{

    // fallback to old system
    const res = await fetch(`./Content/${branchId}.json`, {cache:"no-store"});
    if(!res.ok) throw new Error(`Failed to load Content/${branchId}.json`);
    return await res.json();

  }
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
  if(colors.topbarBg) root.style.setProperty("--topbar-bg", colors.topbarBg);
  if(colors.footerBg) root.style.setProperty("--footer-bg", colors.footerBg);
  if(colors.linkColor) root.style.setProperty("--link-color", colors.linkColor);
  if(colors.buttonBg) root.style.setProperty("--button-bg", colors.buttonBg);
  if(colors.buttonText) root.style.setProperty("--button-text", colors.buttonText);
  if(colors.heroOverlay) root.style.setProperty("--hero-overlay", colors.heroOverlay);
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
  
  applyBranchColors(data);
  setFaviconFromLogo(data);
  
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
