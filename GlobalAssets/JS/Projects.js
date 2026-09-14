import { loadHeaderFooter, HF_main } from "./HeaderFooter.js";
import { loadBranch } from "./OpenJsons.js";


function getURLParam(name){
  return new URLSearchParams(window.location.search).get(name);
}


function makeSlug(text){
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


function hasSections(data){
  return Array.isArray(data?.sections) && data.sections.length > 0;
}


function normalizeBranchEntry(entry){
  if(typeof entry === "string"){
    const branch = entry.trim();
    return branch ? { branch, title: branch } : null;
  }

  if(!entry || typeof entry !== "object") return null;

  const branch = String(entry.branch || "").trim();
  if(!branch) return null;

  return {
    branch,
    title: String(entry.title || branch).trim()
  };
}


async function loadProjectNode(branchId, title = "", ancestry = new Set()){
  const branch = String(branchId || "").trim();

  if(!branch || ancestry.has(branch)) return null;

  let data;

  try{
    data = await loadBranch(branch, "Projects");
  }catch(err){
    console.info(
      `No Projects.json for branch "${branch}". It will not be shown in the projects menu.`
    );
    return null;
  }

  const nextAncestry = new Set(ancestry);
  nextAncestry.add(branch);

  const node = {
    branch,
    title: String(title || data?.title || branch).trim(),
    data: data || {},
    children: []
  };

  const branchEntries = Array.isArray(data?.branches)
    ? data.branches.map(normalizeBranchEntry).filter(Boolean)
    : [];

  const children = await Promise.all(
    branchEntries.map(child =>
      loadProjectNode(child.branch, child.title, nextAncestry)
    )
  );

  node.children = children.filter(Boolean);
  return node;
}


function findFirstProjectNode(node){
  if(!node) return null;

  if(hasSections(node.data)) return node;

  for(const child of node.children || []){
    const found = findFirstProjectNode(child);
    if(found) return found;
  }

  return null;
}


function getImageMax(value, fallback = 280){
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}


function normalizeGallery(entry){
  const gallery = [];

  if(entry?.image && String(entry.image).trim()){
    gallery.push({
      src: entry.image,
      alt: entry.title || ""
    });
  }

  if(Array.isArray(entry?.gallery)){
    for(const item of entry.gallery){
      if(!item) continue;

      if(typeof item === "string"){
        if(item.trim()){
          gallery.push({
            src: item,
            alt: entry.title || ""
          });
        }
        continue;
      }

      if(typeof item === "object" && item.src){
        gallery.push({
          src: item.src,
          alt: item.alt || item.title || entry.title || ""
        });
      }
    }
  }

  return gallery;
}


function createLightbox(){
  const lightbox = document.querySelector("[data-showcase-lightbox]");
  const image = document.querySelector("[data-showcase-lightbox-image]");
  const caption = document.querySelector("[data-showcase-lightbox-caption]");
  const closeButtons = document.querySelectorAll("[data-showcase-lightbox-close]");
  const prevButton = document.querySelector("[data-showcase-prev]");
  const nextButton = document.querySelector("[data-showcase-next]");

  if(!lightbox || !image || !caption) return null;

  let gallery = [];
  let index = 0;
  let title = "";

  function render(){
    if(!gallery.length) return;

    const current = gallery[index];

    image.classList.remove("is-landscape", "is-portrait");

    image.onload = () => {
      if(image.naturalWidth > image.naturalHeight){
        image.classList.add("is-landscape");
      }else{
        image.classList.add("is-portrait");
      }
    };

    image.src = current.src;
    image.alt = current.alt || title;

    caption.textContent = gallery.length > 1
      ? `${title} (${index + 1}/${gallery.length})`
      : title;
  }

  function open(items, startIndex = 0, itemTitle = ""){
    gallery = Array.isArray(items) ? items : [];
    if(!gallery.length) return;

    index = Math.max(0, Math.min(startIndex, gallery.length - 1));
    title = itemTitle || "";

    render();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function close(){
    lightbox.hidden = true;
    image.src = "";
    image.alt = "";
    caption.textContent = "";
    document.body.style.overflow = "";
  }

  function previous(){
    if(!gallery.length) return;
    index = (index - 1 + gallery.length) % gallery.length;
    render();
  }

  function next(){
    if(!gallery.length) return;
    index = (index + 1) % gallery.length;
    render();
  }

  for(const button of closeButtons){
    button.addEventListener("click", close);
  }

  prevButton?.addEventListener("click", previous);
  nextButton?.addEventListener("click", next);

  document.addEventListener("keydown", event => {
    if(lightbox.hidden) return;

    if(event.key === "Escape") close();
    if(event.key === "ArrowLeft") previous();
    if(event.key === "ArrowRight") next();
  });

  return { open };
}


function buildMediaBlock(entry, lightbox, fallbackMax = 280){
  const gallery = normalizeGallery(entry);
  if(!gallery.length) return null;

  const media = document.createElement("div");
  media.className = "showcase-media";
  media.style.setProperty(
    "--showcase-image-size",
    `${getImageMax(entry.imageMax, fallbackMax)}px`
  );

  const button = document.createElement("button");
  button.className = "showcase-image-button";
  button.type = "button";

  const img = document.createElement("img");
  img.className = "showcase-image";
  img.src = gallery[0].src;
  img.alt = gallery[0].alt || entry.title || "";

  img.addEventListener("error", () => {
    media.hidden = true;
  });

  button.appendChild(img);

  button.addEventListener("click", () => {
    lightbox?.open(gallery, 0, entry.title || "");
  });

  media.appendChild(button);

  if(gallery.length > 1){
    const count = document.createElement("div");
    count.className = "showcase-gallery-count";
    count.textContent = `${gallery.length} images`;
    media.appendChild(count);
  }

  return media;
}


function appendParagraphs(host, value){
  if(value === null || value === undefined || value === "") return;

  const lines = Array.isArray(value) ? value : [value];

  for(const line of lines){
    if(!String(line || "").trim()){
      const spacer = document.createElement("div");
      spacer.style.height = "10px";
      host.appendChild(spacer);
      continue;
    }

    const p = document.createElement("p");
    p.textContent = String(line);
    host.appendChild(p);
  }
}


function buildTextBlock(title, value){
  if(value === null || value === undefined || value === "") return null;
  if(Array.isArray(value) && value.length === 0) return null;

  const block = document.createElement("div");
  block.className = "showcase-block";

  if(title){
    const heading = document.createElement("h4");
    heading.textContent = title;
    block.appendChild(heading);
  }

  appendParagraphs(block, value);
  return block;
}


function buildMeta(details){
  if(!details || typeof details !== "object" || Array.isArray(details)){
    return null;
  }

  const entries = Object.entries(details).filter(([, value]) => {
    if(value === null || value === undefined || value === "") return false;
    if(Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  if(!entries.length) return null;

  const wrap = document.createElement("div");
  wrap.className = "showcase-meta";

  for(const [key, value] of entries){
    const row = document.createElement("div");
    row.className = "showcase-meta-row";

    const left = document.createElement("div");
    left.className = "showcase-meta-key";
    left.textContent = key;

    const right = document.createElement("div");
    right.className = "showcase-meta-value";
    right.textContent = Array.isArray(value)
      ? value.join(", ")
      : String(value);

    row.append(left, right);
    wrap.appendChild(row);
  }

  return wrap;
}


function formatBlockTitle(key){
  const text = String(key || "").trim();
  if(!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}


function isReservedEntryKey(key){
  return [
    "title",
    "href",
    "image",
    "imagemax",
    "gallery",
    "items",
    "sections",
    "dropdowns",
    "render",
    "type",
    "content",
    "text",
    "lines",
    "_hideinnertitle",
    "details",
    "branches",
    "id"
  ].includes(String(key || "").toLowerCase());
}


function buildDropdownValue(value){
  const host = document.createElement("div");

  if(Array.isArray(value)){
    const objectList = value.every(
      item => item && typeof item === "object" && !Array.isArray(item)
    );

    if(objectList){
      for(const item of value){
        host.appendChild(buildEntry(item, null, "h4", 220, ""));
      }
    }else{
      appendParagraphs(host, value);
    }

    return host;
  }

  if(value && typeof value === "object"){
    if(Array.isArray(value.items)){
      for(const item of value.items){
        host.appendChild(buildEntry(item, null, "h4", 220, ""));
      }
    }else{
      const meta = buildMeta(value);
      if(meta) host.appendChild(meta);
    }

    return host;
  }

  appendParagraphs(host, value);
  return host;
}


function buildDropdowns(entry){
  if(!Array.isArray(entry?.dropdowns)) return [];

  const blocks = [];

  for(const dropdown of entry.dropdowns){
    if(!dropdown || typeof dropdown !== "object") continue;

    const wrap = document.createElement("div");
    wrap.className = "showcase-dropdown";

    const toggle = document.createElement("button");
    toggle.className = "showcase-dropdown-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.textContent = dropdown.title || "More";

    const icon = document.createElement("span");
    icon.className = "showcase-dropdown-icon";
    icon.textContent = "+";

    const body = document.createElement("div");
    body.className = "showcase-dropdown-body";
    body.hidden = true;

    const value =
      dropdown.content ??
      dropdown.text ??
      dropdown.lines ??
      dropdown.items ??
      "";

    body.appendChild(buildDropdownValue(value));

    toggle.append(label, icon);

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";

      toggle.setAttribute("aria-expanded", String(!open));
      icon.textContent = open ? "+" : "−";
      body.hidden = open;
    });

    wrap.append(toggle, body);
    blocks.push(wrap);
  }

  return blocks;
}


function buildEntry(
  entry,
  lightbox,
  headingLevel = "h3",
  fallbackMax = 280,
  parentPath = ""
){
  const wrap = document.createElement("div");
  wrap.className = "showcase-item-inner";

  if(parentPath){
    wrap.dataset.showcasePath = parentPath;
  }

  const media = buildMediaBlock(entry, lightbox, fallbackMax);
  if(media) wrap.appendChild(media);

  const content = document.createElement("div");
  content.className = "showcase-content";

  if(!entry?._hideInnerTitle){
    const heading = document.createElement(headingLevel);
    heading.className = "showcase-title";

    if(entry?.href){
      const link = document.createElement("a");
      link.href = entry.href;
      link.textContent = entry.title || "";
      heading.appendChild(link);
    }else{
      heading.textContent = entry?.title || "";
    }

    content.appendChild(heading);
  }

  for(const [key, value] of Object.entries(entry || {})){
    if(isReservedEntryKey(key)) continue;

    const validString =
      typeof value === "string" && value.trim();

    const validTextList =
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(line => typeof line === "string");

    if(validString || validTextList){
      const block = buildTextBlock(formatBlockTitle(key), value);
      if(block) content.appendChild(block);
    }
  }

  const meta = buildMeta(entry?.details);
  if(meta) content.appendChild(meta);

  for(const dropdown of buildDropdowns(entry)){
    content.appendChild(dropdown);
  }

  wrap.appendChild(content);
  return wrap;
}


function getSectionDescription(section){
  if(section?.description !== undefined){
    return section.description;
  }

  if(section && Object.prototype.hasOwnProperty.call(section, "")){
    return section[""];
  }

  return null;
}


function renderProjects(data, lightbox){
  const host = document.querySelector("[data-projects-sections]");
  if(!host) return;

  host.innerHTML = "";

  const sections = Array.isArray(data?.sections)
    ? data.sections
    : [];

  if(!sections.length){
    const empty = document.createElement("div");
    empty.className = "card projects-empty";

    const p = document.createElement("p");
    p.textContent = "No projects are listed for this branch.";

    empty.appendChild(p);
    host.appendChild(empty);
    return;
  }

  for(const section of sections){
    const sectionCard = document.createElement("section");
    sectionCard.className = "card showcase-section";

    const sectionPath = makeSlug(section?.title || "section");
    sectionCard.dataset.showcasePath = sectionPath;

    const sectionEntry = {
      ...section,
      items: undefined,
      sections: undefined,
      branches: undefined,
      _hideInnerTitle: true
    };

    const media = buildMediaBlock(sectionEntry, lightbox, 320);
    if(media) sectionCard.appendChild(media);

    const heading = document.createElement("h2");
    heading.textContent = section?.title || "Projects";
    sectionCard.appendChild(heading);

    const description = getSectionDescription(section);

    if(description){
      const descriptionHost = document.createElement("div");
      descriptionHost.setAttribute("data-showcase-body", "");
      appendParagraphs(descriptionHost, description);
      sectionCard.appendChild(descriptionHost);
    }

    const items = document.createElement("div");
    items.className = "showcase-items";

    for(const item of (section?.items || [])){
      if(!item || typeof item !== "object") continue;

      const itemCard = document.createElement("article");
      itemCard.className = "card showcase-item";

      const itemSlug = makeSlug(item.id || item.title || "item");
      const itemPath = `${sectionPath}/${itemSlug}`;

      itemCard.dataset.showcasePath = itemPath;

      itemCard.appendChild(
        buildEntry(item, lightbox, "h3", 280, itemPath)
      );

      items.appendChild(itemCard);
    }

    if(items.children.length){
      sectionCard.appendChild(items);
    }

    const clear = document.createElement("div");
    clear.style.clear = "both";
    sectionCard.appendChild(clear);

    host.appendChild(sectionCard);
  }

  openItemFromURL();
}


function openItemFromURL(){
  const path = getURLParam("path") || getURLParam("item");
  if(!path) return;

  const parts = String(path)
    .split("/")
    .map(part => makeSlug(part))
    .filter(Boolean);

  if(!parts.length) return;

  let currentPath = "";
  let lastTarget = null;

  for(const part of parts){
    currentPath = currentPath
      ? `${currentPath}/${part}`
      : part;

    const target = document.querySelector(
      `[data-showcase-path="${CSS.escape(currentPath)}"]`
    );

    if(!target) return;
    lastTarget = target;
  }

  lastTarget?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


/*-------------- Projects branch menu --------------*/

function updateActiveMenuButtons(activeBranch){
  document.querySelectorAll("[data-projects-branch]").forEach(button => {
    const active = button.dataset.projectsBranch === activeBranch;

    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}


function closeSiblingProjectDropdowns(details){
  const parent = details.parentElement;
  if(!parent) return;

  for(const sibling of parent.children){
    if(
      sibling !== details &&
      sibling.matches?.(".projects-menu-dropdown[open]")
    ){
      sibling.removeAttribute("open");
    }
  }
}


function renderMenuNode(node, activeState, lightbox){
  const hasChildren =
    Array.isArray(node.children) &&
    node.children.length > 0;

  if(!hasChildren){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "projects-menu-button";
    button.dataset.projectsBranch = node.branch;
    button.textContent = node.title || node.branch;

    button.addEventListener("click", () => {
      if(!hasSections(node.data)) return;

      activeState.node = node;
      renderProjects(node.data, lightbox);
      updateActiveMenuButtons(node.branch);
    });

    return button;
  }

  const details = document.createElement("details");
  details.className = "projects-menu-dropdown";

  const summary = document.createElement("summary");
  summary.className = "projects-menu-summary";
  summary.dataset.projectsBranch = node.branch;
  summary.textContent = node.title || node.branch;

  /*
    Like the Albums menu:
    - children are closed by default
    - summary controls the dropdown
    - opening a dropdown closes its siblings
    - nested dropdowns remain recursive
  */
  details.addEventListener("toggle", () => {
    if(details.open){
      closeSiblingProjectDropdowns(details);
    }
  });

  /*
    A parent branch can also contain its own projects.
    Clicking its summary selects those projects while the native
    <details> behavior opens/closes the branch list.
  */
  summary.addEventListener("click", () => {
    if(!hasSections(node.data)) return;

    activeState.node = node;
    renderProjects(node.data, lightbox);
    updateActiveMenuButtons(node.branch);
  });

  const body = document.createElement("div");
  body.className = "projects-menu-dropdown-body";

  for(const child of node.children){
    body.appendChild(
      renderMenuNode(child, activeState, lightbox)
    );
  }

  details.append(summary, body);
  return details;
}


function renderProjectMenu(rootNode, activeState, lightbox){
  const menu = document.querySelector("[data-projects-menu]");
  const tree = document.querySelector("[data-projects-menu-tree]");

  if(!menu || !tree) return;

  tree.innerHTML = "";

  const children = Array.isArray(rootNode?.children)
    ? rootNode.children
    : [];

  if(!children.length){
    menu.hidden = true;
    return;
  }

  for(const child of children){
    tree.appendChild(
      renderMenuNode(child, activeState, lightbox)
    );
  }

  menu.hidden = false;

  if(activeState.node){
    updateActiveMenuButtons(activeState.node.branch);
  }
}


async function main(){
  await loadHeaderFooter();

  const headerState = await HF_main();

  const rootBranch = String(
    getURLParam("branch") ||
    headerState?.branch ||
    ""
  ).trim();

  if(!rootBranch){
    throw new Error("No project branch was provided.");
  }

  const rootNode = await loadProjectNode(rootBranch, "");

  if(!rootNode){
    throw new Error(
      `No Projects.json could be loaded for "${rootBranch}".`
    );
  }

  const lightbox = createLightbox();
  const firstProjectNode = findFirstProjectNode(rootNode);

  const activeState = {
    node: firstProjectNode
  };

  renderProjectMenu(rootNode, activeState, lightbox);

  if(firstProjectNode){
    renderProjects(firstProjectNode.data, lightbox);
    updateActiveMenuButtons(firstProjectNode.branch);
  }else{
    renderProjects({ sections: [] }, lightbox);
  }
}


main().catch(err => {
  console.error(err);

  const host = document.querySelector("[data-projects-sections]");

  if(host){
    host.innerHTML = "";

    const card = document.createElement("div");
    card.className = "card projects-empty";

    const title = document.createElement("h2");
    title.textContent = "Projects failed to load";

    const message = document.createElement("p");
    message.textContent = err.message;

    card.append(title, message);
    host.appendChild(card);
  }
});
