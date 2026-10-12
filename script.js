// ====================================================================
// SETTINGS
// ====================================================================
const SPRITE_PATH = "sprites/races/human_female.svg";

// Each part has:
//   original: the colors in the SVG, in class order (skin-0, skin-1, ...).
//             The first one is the "base" color; the rest are its shading.
//   palette:  the colors the slider steps through. Only the base color is
//             listed; shading is calculated to match.
//   start:    which palette entry the slider starts on.
const PARTS = {
  skin: {
    label: "Skin",
    original: ["#F3BD94", "#DFA17A", "#D58962", "#D47360", "#C47A52", "#906247"],
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
    original: ["#42251A", "#27120A", "#5B2B1A", "#984D2B"],
    palette: [
      ["Black",      "#1E1916"],
      ["Dark brown", "#42251A"],
      ["Brown",      "#6B4128"],
      ["Auburn",     "#8A3A1E"],
      ["Ginger",     "#B8561F"],
      ["Blonde",     "#C9A25C"],
      ["Platinum",   "#E3D8BE"],
      ["Silver",     "#A7A8AE"],
      ["Pink",       "#D56A9A"],
      ["Blue",       "#3E5FA8"],
    ],
    start: 1,
  },
  iris: {
    label: "Eyes",
    original: ["#234C7F"],
    palette: [
      ["Brown",      "#5A3A22"],
      ["Hazel",      "#7A6A2E"],
      ["Amber",      "#B07A1E"],
      ["Green",      "#3F7A45"],
      ["Blue",       "#234C7F"],
      ["Light blue", "#5E9BD1"],
      ["Grey",       "#7C8793"],
      ["Violet",     "#6B4A9E"],
    ],
    start: 4,
  },
  bikini: {
    label: "Bikini",
    original: ["#F1F1F1", "#CECED4"],
    palette: [
      ["White",  "#F1F1F1"],
      ["Black",  "#2B2B30"],
      ["Red",    "#C8323C"],
      ["Coral",  "#F07A63"],
      ["Yellow", "#F2C94C"],
      ["Green",  "#3FA36B"],
      ["Teal",   "#2A9D9A"],
      ["Blue",   "#3B6FD1"],
      ["Purple", "#7E57C2"],
      ["Pink",   "#E86FA8"],
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

// ====================================================================
// SLIDERS
// ====================================================================
const root = document.documentElement;
const $ = (id) => document.getElementById(id);

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

$("reset").addEventListener("click", () => {
  for (const key in PARTS) {
    PARTS[key].slider.value = PARTS[key].start;
    applyPart(key);
  }
});

// ====================================================================
// LOAD THE SVG INTO THE PAGE
// ====================================================================
async function loadSprite() {
  try {
    const res = await fetch(SPRITE_PATH);
    if (!res.ok) throw new Error(`${res.status}`);
    $("sprite").innerHTML = await res.text();
  } catch (err) {
    $("sprite-error").textContent =
      `Couldn't load ${SPRITE_PATH}. If you opened index.html by double-clicking it, ` +
      `run it with a local server instead (e.g. VS Code's Live Server).`;
    $("sprite-error").hidden = false;
  }
}

buildSliders();
loadSprite();
