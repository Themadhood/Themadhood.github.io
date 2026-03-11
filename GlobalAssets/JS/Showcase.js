import { loadHeaderFooter, HF_main, setText } from "./HeaderFooter.js";
import { loadBranch } from "./OpenJsons.js";


function addParagraphs(host, lines){
  if(!host) return;

  host.innerHTML = "";

  if(Array.isArray(lines)){
    for(const p of lines){
      if(!String(p || "").trim()){
        const spacer = document.createElement("div");
        spacer.style.height = "12px";
        host.appendChild(spacer);
        continue;
      }

      const el = document.createElement("p");
      el.textContent = p;
      host.appendChild(el);
    }
    return;
  }

  if(String(lines || "").trim()){
    const el = document.createElement("p");
    el.textContent = lines;
    host.appendChild(el);
  }
}


function normalizeGallery(item){
  const gallery = [];

  if(item.image && String(item.image).trim()){
    gallery.push({
      src: item.image,
      alt: item.title || ""
    });
  }

  if(Array.isArray(item.gallery)){
    for(const entry of item.gallery){
      if(!entry) continue;

      if(typeof entry === "string"){
        if(entry.trim()){
          gallery.push({
            src: entry,
            alt: item.title || ""
          });
        }
        continue;
      }

      if(typeof entry === "object" && entry.src){
        gallery.push({
          src: entry.src,
          alt: entry.alt || item.title || ""
        });
      }
    }
  }

  return gallery;
}


function buildMeta(details){
  if(!details || typeof details !== "object"){
    return null;
  }

  const entries = Object.entries(details).filter(([, value]) => {
    if(value === null || value === undefined) return false;
    if(value === "") return false;
    if(Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  if(!entries.length){
    return null;
  }

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

    if(Array.isArray(value)){
      right.textContent = value.join(", ");
    }else{
      right.textContent = String(value);
    }

    row.appendChild(left);
    row.appendChild(right);
    wrap.appendChild(row);
  }

  return wrap;
}


function buildTextBlock(title, value){
  if(!value) return null;

  const block = document.createElement("div");
  block.className = "showcase-block";

  const heading = document.createElement("h4");
  heading.textContent = title;
  block.appendChild(heading);

  if(Array.isArray(value)){
    for(const line of value){
      if(!String(line || "").trim()){
        const spacer = document.createElement("div");
        spacer.style.height = "10px";
        block.appendChild(spacer);
        continue;
      }

      const p = document.createElement("p");
      p.textContent = line;
      block.appendChild(p);
    }
  }else{
    const p = document.createElement("p");
    p.textContent = value;
    block.appendChild(p);
  }

  return block;
}


function createLightbox(){
  const lightbox = document.querySelector("[data-showcase-lightbox]");
  const image = document.querySelector("[data-showcase-lightbox-image]");
  const caption = document.querySelector("[data-showcase-lightbox-caption]");
  const closeButtons = document.querySelectorAll("[data-showcase-lightbox-close]");
  const prevButton = document.querySelector("[data-showcase-prev]");
  const nextButton = document.querySelector("[data-showcase-next]");

  if(!lightbox || !image || !caption){
    return null;
  }

  let currentGallery = [];
  let currentIndex = 0;
  let currentTitle = "";

  function render(){
    if(!currentGallery.length) return;

    const current = currentGallery[currentIndex];
    image.src = current.src;
    image.alt = current.alt || currentTitle || "";

    if(currentGallery.length > 1){
      caption.textContent = `${currentTitle} (${currentIndex + 1}/${currentGallery.length})`;
    }else{
      caption.textContent = currentTitle;
    }
  }

  function open(gallery, startIndex, title){
    currentGallery = Array.isArray(gallery) ? gallery : [];
    currentIndex = startIndex || 0;
    currentTitle = title || "";

    if(!currentGallery.length){
      return;
    }

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

  function prev(){
    if(!currentGallery.length) return;
    currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    render();
  }

  function next(){
    if(!currentGallery.length) return;
    currentIndex = (currentIndex + 1) % currentGallery.length;
    render();
  }

  for(const button of closeButtons){
    button.addEventListener("click", close);
  }

  if(prevButton){
    prevButton.addEventListener("click", prev);
  }

  if(nextButton){
    nextButton.addEventListener("click", next);
  }

  document.addEventListener("keydown", event => {
    if(lightbox.hidden) return;

    if(event.key === "Escape") close();
    if(event.key === "ArrowLeft") prev();
    if(event.key === "ArrowRight") next();
  });

  return { open };
}


function renderShowcase(showcaseData){
  const page = showcaseData || {};

  setText(document.querySelector("[data-showcase-title]"), page.title || "");

  const bodyHost = document.querySelector("[data-showcase-body]");
  addParagraphs(bodyHost, page.body || []);

  const sectionsHost = document.querySelector("[data-showcase-sections]");
  if(!sectionsHost){
    return;
  }

  sectionsHost.innerHTML = "";

  const lightbox = createLightbox();

  for(const section of (page.sections || [])){
    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.marginTop = "14px";

    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h2");
    title.textContent = section.title || "";
    card.appendChild(title);

    if(section.body){
      const body = document.createElement("div");
      body.className = "small";
      body.style.marginBottom = "12px";
      body.textContent = section.body;
      card.appendChild(body);
    }

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "showcase-items";

    for(const item of (section.items || [])){
      const itemCard = document.createElement("div");
      itemCard.className = "card showcase-item";

      const inner = document.createElement("div");
      inner.className = "showcase-item-inner";

      const gallery = normalizeGallery(item);

      if(gallery.length){
        const media = document.createElement("div");
        media.className = "showcase-media";

        const button = document.createElement("button");
        button.className = "showcase-image-button";
        button.type = "button";

        const img = document.createElement("img");
        img.className = "showcase-image";
        img.src = gallery[0].src;
        img.alt = gallery[0].alt || item.title || "";

        button.appendChild(img);

        button.addEventListener("click", () => {
          if(lightbox){
            lightbox.open(gallery, 0, item.title || "");
          }
        });

        media.appendChild(button);

        if(gallery.length > 1){
          const count = document.createElement("div");
          count.className = "showcase-gallery-count";
          count.textContent = `${gallery.length} images`;
          media.appendChild(count);
        }

        inner.appendChild(media);
      }

      const content = document.createElement("div");
      content.className = "showcase-content";

      const heading = document.createElement("h3");
      heading.className = "showcase-title";

      if(item.href){
        const link = document.createElement("a");
        link.href = item.href;
        link.target = "_blank";
        link.rel = "noopener";
        link.style.textDecoration = "none";
        link.style.color = "inherit";
        link.textContent = item.title || "";
        heading.appendChild(link);
      }else{
        heading.textContent = item.title || "";
      }

      content.appendChild(heading);

      const descriptionBlock = buildTextBlock("Description", item.description);
      if(descriptionBlock){
        content.appendChild(descriptionBlock);
      }

      const aboutBlock = buildTextBlock("About", item.about);
      if(aboutBlock){
        content.appendChild(aboutBlock);
      }

      const infoBlock = buildTextBlock("Info", item.info);
      if(infoBlock){
        content.appendChild(infoBlock);
      }

      const notesBlock = buildTextBlock("Notes", item.notes);
      if(notesBlock){
        content.appendChild(notesBlock);
      }

      const meta = buildMeta(item.details);
      if(meta){
        content.appendChild(meta);
      }

      inner.appendChild(content);
      itemCard.appendChild(inner);
      itemsWrap.appendChild(itemCard);
    }

    card.appendChild(itemsWrap);
    grid.appendChild(card);
    sectionsHost.appendChild(grid);
  }
}


async function main(){
  await loadHeaderFooter();
  const { branch } = await HF_main();
  const showcaseData = await loadBranch(branch, "Showcase");

  renderShowcase(showcaseData);
}


main().catch(err => {
  console.error(err);
  document.body.innerHTML = `<div class="container"><h1>Site failed to load</h1><p>${err.message}</p></div>`;
});