import { loadHeaderFooter, HF_main } from "/GlobalAssets/JS/HeaderFooter.js";
import { loadPath } from "/GlobalAssets/JS/OpenJsons.js";

const status = document.querySelector("[data-status]");
const tracksHost = document.querySelector("[data-tracks]");

function SetText(selector, value) {
  const el = document.querySelector(selector);
  if (el && typeof value === "string") el.textContent = value;
}

function SetStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
  status.hidden = !message;
}

function CreateTrack(track, index) {
  if (!track || typeof track.file !== "string" || !track.file.trim()) {
    throw new Error(`Track ${index + 1} needs an MP3 filename in config.json.`);
  }

  const card = document.createElement("article");
  card.className = "card track-card";

  const label = document.createElement("div");
  label.className = "track-label";
  label.textContent = track.label || `OPTION ${index + 1}`;

  const icon = document.createElement("div");
  icon.className = "track-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';

  const title = document.createElement("h2");
  title.textContent = track.title || `Track ${index + 1}`;

  const description = document.createElement("p");
  description.textContent = track.description || "Listen to this version.";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "metadata";
  audio.setAttribute("aria-label", `Play ${title.textContent}`);
  audio.controlsList.add("nodownload");
  // Resolve to this page directory, not the website root.
  audio.src = new URL(track.file, import.meta.url).href;

  const help = document.createElement("div");
  help.className = "track-help";
  help.setAttribute("aria-live", "polite");
  audio.addEventListener("error", () => {
    help.textContent = "Audio unavailable. Check the MP3 filename and that the file is uploaded beside index.html.";
  });

  card.append(label, icon, title, description, audio, help);
  return {card, audio};
}

function RenderTracks(tracks) {
  if (!Array.isArray(tracks) || tracks.length !== 2) {
    throw new Error("config.json must contain exactly two tracks.");
  }
  tracksHost.replaceChildren();
  const players = tracks.map((track, i) => CreateTrack(track, i));
  for (const item of players) tracksHost.append(item.card);
  // One track at a time makes A/B comparisons easier.
  for (const item of players) {
    item.audio.addEventListener("play", () => {
      for (const other of players) {
        if (other !== item) other.audio.pause();
      }
    });
  }
}

function NormalizeGoogleFormUrl(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "docs.google.com") return null;
    if (!/^\/forms\/d\/(?:e\/)?[^/]+\/viewform\/?$/.test(url.pathname)) return null;
    url.searchParams.set("embedded", "true");
    return url.href;
  } catch { return null; }
}

function RenderForm(form) {
  document.querySelector("[data-form-section]").hidden = false;
  if (form?.title) SetText("[data-form-title]", form.title);
  if (form?.description) SetText("[data-form-description]", form.description);

  const iframe = document.querySelector("[data-form]");
  const placeholder = document.querySelector("[data-form-placeholder]");
  const external = document.querySelector("[data-form-link]");
  const url = NormalizeGoogleFormUrl(form?.url);
  if (!url) {
    placeholder.hidden = false;
    iframe.hidden = true;
    external.hidden = true;
    return;
  }
  iframe.src = url;
  iframe.hidden = false;
  placeholder.hidden = true;
  external.href = url.replace(/([?&])embedded=true(&|$)/, "$1").replace(/[?&]$/, "");
  external.hidden = false;
  const height = Number(form?.height);
  if (Number.isFinite(height) && height >= 300 && height <= 3000) {
    iframe.style.minHeight = `${height}px`;
  }
}

async function Main() {
  // Use the same music branch settings as the other Music pages, without
  // adding a public navigation link or editing the shared assets.
  const url = new URL(location.href);
  if (url.searchParams.get("branch") !== "music") {
    url.searchParams.set("branch", "music");
    history.replaceState({}, "", url);
  }
  await loadHeaderFooter();
  await HF_main();
  document.title = "Music Vote | Themadhood's Music";

  // Existing shared JSON opener; all voting content stays local to this page.
  const config = await loadPath("/Music/Vote", "config");
  SetText("[data-eyebrow]", config.eyebrow);
  SetText("[data-title]", config.title);
  SetText("[data-description]", config.description);
  RenderTracks(config.tracks);
  RenderForm(config.googleForm);
  SetStatus("");
}

Main().catch(error => {
  console.error("Music vote page failed:", error);
  SetStatus(`Unable to load the voting page: ${error.message}`, true);
});
