// ====================================================================
// SETTINGS
// ====================================================================
const SPRITE_DIR = "sprites/body/";

// The character is drawn on the body's 120x120 grid. This crops the
// empty space around it.
const VIEWBOX = "24 0 72 120";

// Every body file puts the top of the neck here (x = center, y = top).
const NECK = { x: 60, y: 42 };

// How far the neck tucks up under the chin, in pixels.
const NECK_OVERLAP = 0;

// ---- Shape pickers -------------------------------------------------
// "toggle" pickers are combined to make the body file name, e.g.
// female-thin-weak.svg. "style" pickers step through numbered files,
// e.g. eye-1.svg ... eye-5.svg.
const PICKERS = {
  sex:      { label: "Body",     type: "toggle", options: [["female", "Female"], ["male", "Male"]], start: 0 },
  build:    { label: "Build",    type: "toggle", options: [["thin", "Thin"], ["large", "Large"]],   start: 0 },
  strength: { label: "Strength", type: "toggle", options: [["weak", "Weak"], ["strong", "Strong"]], start: 0 },
  face:     { label: "Hair",     type: "style",  file: "face",  count: 8, start: 0 },
  eye:      { label: "Eyes",     type: "style",  file: "eye",   count: 5, start: 0 },
  nose:     { label: "Nose",     type: "style",  file: "nose",  count: 5, start: 0 },
  mouth:    { label: "Mouth",    type: "style",  file: "mouth", count: 5, start: 0 },
};

// ---- Color sliders -------------------------------------------------
// Each part has:
//   original: the colors used in the SVG files. The first one is the
//             "base" color; the rest are its shading. Any shape in any
//             file with one of these colors gets recolored.
//   palette:  the colors the slider steps through. Only the base color is
//             listed; shading is calculated to match.
//   start:    which palette entry the slider starts on.
const PARTS = {
  skin: {
    label: "Skin",
    original: ["#F3BD94", "#D58962"],
    palette: [
      ["Porcelain", "#F9DCCB"],
      ["Peach",     "#F3BD94"],
      ["Sand",      "#E2AC7E"],
      ["Honey",     "#CB9062"],
      ["Caramel",   "#AB6E47"],
      ["Bronze",    "#8C5738"],
      ["Chestnut",  "#6E4029"],
      ["Espresso",  "#4B2C1C"],
    ],
    start: 1,
  },
  hair: {
    label: "Hair",
    original: ["#7E3E0D"],
    palette: [
      ["Black",      "#1E1916"],
      ["Dark brown", "#42251A"],
      ["Brown",      "#7E3E0D"],
      ["Auburn",     "#8A3A1E"],
      ["Ginger",     "#B8561F"],
      ["Blonde",     "#C9A25C"],
      ["Platinum",   "#E3D8BE"],
      ["Silver",     "#A7A8AE"],
      ["Pink",       "#D56A9A"],
      ["Blue",       "#3E5FA8"],
    ],
    start: 2,
  },
  iris: {
    label: "Eyes",
    original: ["#3662F3", "#152F83"],
    palette: [
      ["Brown",      "#7A4A26"],
      ["Hazel",      "#8C7A32"],
      ["Amber",      "#C98A1E"],
      ["Green",      "#3F9A4F"],
      ["Blue",       "#3662F3"],
      ["Light blue", "#6FAEE6"],
      ["Grey",       "#8A96A3"],
      ["Violet",     "#7E57C2"],
    ],
    start: 4,
  },
  clothes: {
    label: "Clothes",
    original: ["#DD6F6F"],
    palette: [
      ["Rose",   "#DD6F6F"],
      ["White",  "#F1F1F1"],
      ["Black",  "#2B2B30"],
      ["Red",    "#C8323C"],
      ["Yellow", "#F2C94C"],
      ["Green",  "#3FA36B"],
      ["Teal",   "#2A9D9A"],
      ["Blue",   "#3B6FD1"],
      ["Purple", "#7E57C2"],
    ],
    start: 0,
  },
};

// ====================================================================
// COLOR MATH — makes shading for any base color
// ====================================================================
function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToCss({ h, s, l }) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}

const clamp = (n) => Math.min(100, Math.max(0, n));

// Keep each shade's relationship to the original base color
// (a bit darker, a bit warmer, etc.) and apply it to the new base.
function makeShades(originals, newBase) {
  const orig = hexToHsl(originals[0]);
  const base = hexToHsl(newBase);
  const useHue = orig.s > 5; // near-white/grey originals have no real hue

  return originals.map((hex, i) => {
    if (i === 0) return newBase;
    const s = hexToHsl(hex);
    const h = base.h + (useHue ? s.h - orig.h : 0);
    const sat = clamp(useHue ? base.s * (s.s / orig.s) : base.s);
    const light = s.l <= orig.l
      ? base.l * (s.l / orig.l)                                 // darker shade
      : base.l + (100 - base.l) * (s.l - orig.l) / (100 - orig.l); // lighter shade
    return hslToCss({ h, s: sat, l: clamp(light) });
  });
}

// Original hex -> CSS variable, e.g. "#D58962" -> "var(--skin-1)"
const COLOR_VARS = {};
for (const key in PARTS) {
  PARTS[key].original.forEach((hex, i) => {
    COLOR_VARS[hex.toUpperCase()] = `var(--${key}-${i})`;
  });
}

// ====================================================================
// BUILDING THE CHARACTER
// ====================================================================
const SVG_NS = "http://www.w3.org/2000/svg";
const root = document.documentElement;
const $ = (id) => document.getElementById(id);

// Each SVG file is only downloaded once.
const fileCache = {};
function loadFile(name) {
  if (!fileCache[name]) {
    fileCache[name] = fetch(SPRITE_DIR + name).then((res) => {
      if (!res.ok) throw new Error(`${name}: ${res.status}`);
      return res.text();
    });
  }
  return fileCache[name];
}

// Turn SVG text into a <g> holding its shapes, with recolorable fills
// pointed at CSS variables.
function toGroup(svgText) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const g = document.createElementNS(SVG_NS, "g");
  for (const child of [...doc.documentElement.children]) {
    g.appendChild(document.importNode(child, true));
  }
  for (const el of g.querySelectorAll("[fill]")) {
    const v = COLOR_VARS[el.getAttribute("fill").toUpperCase()];
    if (v) el.style.fill = v;
  }
  return g;
}

// The head is the biggest skin-colored shape in the face file.
function findHead(faceGroup) {
  let best = null;
  for (const el of faceGroup.querySelectorAll("[fill]")) {
    if (el.style.fill !== "var(--skin-0)") continue;
    const box = el.getBBox();
    if (!best || box.width * box.height > best.width * best.height) best = box;
  }
  return best;
}

function fileNames() {
  const pick = (key) => {
    const p = PICKERS[key];
    return p.type === "toggle" ? p.options[p.value][0] : `${p.file}-${p.value + 1}.svg`;
  };
  return {
    body:  `${pick("sex")}-${pick("build")}-${pick("strength")}.svg`,
    face:  pick("face"),
    eye:   pick("eye"),
    nose:  pick("nose"),
    mouth: pick("mouth"),
  };
}

let drawId = 0;
async function drawCharacter() {
  const id = ++drawId;
  const files = fileNames();
  let texts;
  try {
    texts = await Promise.all(Object.values(files).map(loadFile));
  } catch (err) {
    $("sprite-error").textContent =
      `Couldn't load the sprites (${err.message}). If you opened index.html by ` +
      `double-clicking it, run it with a local server instead (e.g. VS Code's Live Server).`;
    $("sprite-error").hidden = false;
    return;
  }
  if (id !== drawId) return; // a newer click already started drawing

  const [body, face, eye, nose, mouth] = texts.map(toGroup);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", VIEWBOX);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Your character");

  // Layer order, back to front:
  //   face  (hair + head) — behind the body so long hair falls behind the shoulders
  //   body
  //   eyes, nose, mouth  — on top of the head
  const features = document.createElementNS(SVG_NS, "g");
  features.append(eye, nose, mouth);
  svg.append(face, body, features);

  const stage = $("sprite");
  stage.replaceChildren(svg);
  $("sprite-error").hidden = true;

  // Line the head's chin up with the top of the neck...
  const head = findHead(face);
  const dx = NECK.x - (head.x + head.width / 2);
  const dy = NECK.y + NECK_OVERLAP - (head.y + head.height);
  face.setAttribute("transform", `translate(${dx} ${dy})`);

  // ...and put the eye/nose/mouth files (20x20, same size as the head)
  // right on top of the head.
  features.setAttribute("transform", `translate(${head.x + dx} ${head.y + dy})`);
}

// ====================================================================
// SHAPE PICKERS
// ====================================================================
function setPicker(key, value) {
  const p = PICKERS[key];
  const n = p.type === "toggle" ? p.options.length : p.count;
  p.value = ((value % n) + n) % n;
  if (p.type === "toggle") {
    p.buttons.forEach((b, i) => b.setAttribute("aria-pressed", i === p.value));
  } else {
    p.output.textContent = `${p.value + 1} / ${p.count}`;
  }
}

function buildPickers() {
  const container = $("pickers");
  for (const key in PICKERS) {
    const p = PICKERS[key];
    const wrap = document.createElement("div");
    wrap.className = "control picker";
    const label = document.createElement("span");
    label.className = "picker-label";
    label.textContent = p.label;
    wrap.appendChild(label);

    if (p.type === "toggle") {
      const group = document.createElement("div");
      group.className = "toggle";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", p.label);
      p.buttons = p.options.map(([, text], i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = text;
        b.addEventListener("click", () => { setPicker(key, i); drawCharacter(); });
        group.appendChild(b);
        return b;
      });
      wrap.appendChild(group);
    } else {
      const stepper = document.createElement("div");
      stepper.className = "stepper";
      stepper.innerHTML = `
        <button type="button" class="arrow" aria-label="Previous ${p.label.toLowerCase()}">&#8249;</button>
        <output aria-live="polite"></output>
        <button type="button" class="arrow" aria-label="Next ${p.label.toLowerCase()}">&#8250;</button>
      `;
      const [prev, next] = stepper.querySelectorAll("button");
      p.output = stepper.querySelector("output");
      prev.addEventListener("click", () => { setPicker(key, p.value - 1); drawCharacter(); });
      next.addEventListener("click", () => { setPicker(key, p.value + 1); drawCharacter(); });
      wrap.appendChild(stepper);
    }

    container.appendChild(wrap);
    setPicker(key, p.start);
  }
}

// ====================================================================
// COLOR SLIDERS
// ====================================================================
function applyPart(key) {
  const part = PARTS[key];
  const [name, base] = part.palette[part.slider.value];
  makeShades(part.original, base).forEach((color, i) => {
    root.style.setProperty(`--${key}-${i}`, color);
  });
  part.nameEl.textContent = name;
  part.swatchEl.style.background = base;
}

function buildSliders() {
  const container = $("sliders");
  for (const key in PARTS) {
    const part = PARTS[key];
    const wrap = document.createElement("div");
    wrap.className = "control";
    wrap.innerHTML = `
      <div class="control-head">
        <label for="${key}-slider">${part.label}</label>
        <output for="${key}-slider"><span class="swatch"></span><span class="name"></span></output>
      </div>
      <input type="range" id="${key}-slider" min="0" max="${part.palette.length - 1}" step="1" value="${part.start}">
    `;
    container.appendChild(wrap);

    part.slider = wrap.querySelector("input");
    part.nameEl = wrap.querySelector(".name");
    part.swatchEl = wrap.querySelector(".swatch");
    part.slider.addEventListener("input", () => applyPart(key));
    applyPart(key);
  }
}

// ====================================================================
// RANDOMIZE / RESET
// ====================================================================
const randomIndex = (n) => Math.floor(Math.random() * n);

$("randomize").addEventListener("click", () => {
  for (const key in PICKERS) {
    const p = PICKERS[key];
    setPicker(key, randomIndex(p.type === "toggle" ? p.options.length : p.count));
  }
  for (const key in PARTS) {
    PARTS[key].slider.value = randomIndex(PARTS[key].palette.length);
    applyPart(key);
  }
  drawCharacter();
});

$("reset").addEventListener("click", () => {
  for (const key in PICKERS) setPicker(key, PICKERS[key].start);
  for (const key in PARTS) {
    PARTS[key].slider.value = PARTS[key].start;
    applyPart(key);
  }
  drawCharacter();
});

buildPickers();
buildSliders();
drawCharacter();
