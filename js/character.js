// character.js — Canvas 像素小人绘制与属性联动变化

const CHARACTER_PRESETS = [
  { id: 'knight_male', name: '勇者(男)', base: 'knight', gender: 'male' },
  { id: 'knight_female', name: '勇者(女)', base: 'knight', gender: 'female' },
  { id: 'mage_male', name: '法师(男)', base: 'mage', gender: 'male' },
  { id: 'mage_female', name: '法师(女)', base: 'mage', gender: 'female' },
  { id: 'rogue_male', name: '游侠(男)', base: 'rogue', gender: 'male' },
  { id: 'rogue_female', name: '游侠(女)', base: 'rogue', gender: 'female' },
];

// Color palette
const COLORS = {
  skin: '#f4c882',
  skinGlow: '#f8d8a0',
  skinPale: '#e8c090',
  hair_brown: '#6b3a2a',
  hair_blonde: '#d4a44a',
  hair_dark: '#2a1a10',
  hair_red: '#a04030',
  eye_white: '#ffffff',
  eye: '#304050',
  knight_armor: '#6080a0',
  knight_trim: '#c0c0c0',
  mage_robe: '#3048a0',
  mage_trim: '#c0a040',
  rogue_armor: '#405040',
  rogue_trim: '#806040',
  crown: '#d4a010',
  glasses: '#403020',
  boot: '#4a3020',
  belt: '#806040',
  transparent: null,
};

let activePreset = CHARACTER_PRESETS[0];

function setCharacterPreset(id) {
  const found = CHARACTER_PRESETS.find(p => p.id === id);
  if (found) activePreset = found;
}

function getSpriteHash(attrs) {
  // Returns a value 0-1 for each attribute
  return {
    physique: attrs.physique / 100,
    health: attrs.health / 100,
    wealth: attrs.wealth / 100,
    intelligence: attrs.intelligence / 100,
    vision: attrs.vision / 100,
    charm: attrs.charm / 100,
    mentality: attrs.mentality / 100,
    relationships: attrs.relationships / 100,
  };
}

// Draw a 32x32 sprite scaled up
function drawCharacter(canvas, attrs, bmiBodyMod) {
  const ctx = canvas.getContext('2d');
  const scale = 6; // 32*6 = 192px
  canvas.width = 32 * scale;
  canvas.height = 32 * scale;
  ctx.imageSmoothingEnabled = false;

  const h = getSpriteHash(attrs);
  const sprite = buildSprite(h, bmiBodyMod || 0);

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const color = sprite[y][x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
}

function buildSprite(h, bmiBodyMod) {
  // Create a 32x32 pixel grid, null = transparent
  const s = Array.from({ length: 32 }, () => new Array(32).fill(null));

  const preset = activePreset;
  const isMale = preset.gender === 'male';

  // --- Base body (skin) ---
  const skinBase = h.health > 0.7 ? COLORS.skinGlow : h.health > 0.4 ? COLORS.skin : COLORS.skinPale;
  const physiqueBase = isMale ? (3 + Math.floor(h.physique * 3)) : (2 + Math.floor(h.physique * 2));
  const bodyW = Math.max(1, physiqueBase + (bmiBodyMod || 0));
  const bodyStartX = 16 - Math.floor(bodyW / 2);

  // Head (4x5)
  const headW = isMale ? 5 : 4;
  const headH = 5;
  const headX = 16 - Math.floor(headW / 2);
  const headY = 6;
  fillRect(s, headX, headY, headW, headH, skinBase);

  // Eyes
  s[headY + 2][headX + 1] = COLORS.eye_white;
  s[headY + 2][headX + (headW - 2)] = COLORS.eye_white;
  if (h.intelligence > 0.5) {
    // Glasses
    s[headY + 2][headX] = COLORS.glasses;
    s[headY + 2][headX + 2] = COLORS.glasses;
    s[headY + 2][headX + (headW - 1)] = COLORS.glasses;
    s[headY + 2][headX + (headW - 3)] = COLORS.glasses;
  }
  s[headY + 2][headX + 1] = COLORS.eye;
  s[headY + 2][headX + (headW - 2)] = COLORS.eye;

  // Mouth
  const mouthY = headY + 3;
  s[mouthY][headX + 2] = '#803030';

  // Hair
  const hairColor = preset.base === 'mage' ? COLORS.hair_dark : preset.base === 'rogue' ? COLORS.hair_red : COLORS.hair_brown;
  fillRect(s, headX - 1, headY - 1, headW + 2, 2, hairColor);
  s[headY][headX - 1] = hairColor;
  s[headY][headX + headW] = hairColor;
  s[headY + 1][headX - 1] = hairColor;
  s[headY + 1][headX + headW] = hairColor;

  // --- Body ---
  const torsoY = headY + headH;
  const torsoH = isMale ? 7 : 6;
  const torsoColor = preset.base === 'knight' ? COLORS.knight_armor : preset.base === 'mage' ? COLORS.mage_robe : COLORS.rogue_armor;
  const trimColor = preset.base === 'knight' ? COLORS.knight_trim : preset.base === 'mage' ? COLORS.mage_trim : COLORS.rogue_trim;

  fillRect(s, bodyStartX, torsoY, bodyW + 1, torsoH, torsoColor);

  // Belt
  fillRect(s, bodyStartX, torsoY + 4, bodyW + 1, 1, COLORS.belt);

  // Trim / decoration
  fillRect(s, 16 - 1, torsoY, 1, torsoH, trimColor);

  // Charm effect: brighter trim
  if (h.charm > 0.5) {
    const charmLevel = Math.floor(h.charm * 4);
    for (let i = 0; i < charmLevel; i++) {
      s[torsoY + 1 + i][16] = '#ffe8a0';
    }
  }

  // --- Arms ---
  fillRect(s, bodyStartX - 2, torsoY + 1, 2, 4, skinBase);
  fillRect(s, bodyStartX + bodyW + 1, torsoY + 1, 2, 4, skinBase);

  // --- Legs ---
  const legY = torsoY + torsoH;
  fillRect(s, bodyStartX, legY, 2, 5, torsoColor);
  fillRect(s, bodyStartX + bodyW - 1, legY, 2, 5, torsoColor);

  // Boots
  fillRect(s, bodyStartX, legY + 5, 2, 2, COLORS.boot);
  fillRect(s, bodyStartX + bodyW - 1, legY + 5, 2, 2, COLORS.boot);

  // --- Attribute-based additions ---
  // Wealth: crown at high levels
  if (h.wealth > 0.6) {
    s[headY - 2][headX + 1] = COLORS.crown;
    s[headY - 2][headX + 2] = COLORS.crown;
    s[headY - 2][headX + 3] = COLORS.crown;
    s[headY - 3][headX + 2] = COLORS.crown;
  } else if (h.wealth > 0.3) {
    s[headY - 2][headX + 2] = COLORS.crown;
  }

  // Vision: wings/cape at high levels
  if (h.vision > 0.7) {
    s[torsoY + 1][bodyStartX - 3] = '#80c0e0';
    s[torsoY + 2][bodyStartX - 4] = '#80c0e0';
    s[torsoY + 3][bodyStartX - 4] = '#80c0e0';
    s[torsoY + 1][bodyStartX + bodyW + 3] = '#80c0e0';
    s[torsoY + 2][bodyStartX + bodyW + 4] = '#80c0e0';
    s[torsoY + 3][bodyStartX + bodyW + 4] = '#80c0e0';
  }

  // Mentality: halo at high levels
  if (h.mentality > 0.7) {
    s[headY - 1][headX - 1] = '#ffe8a0';
    s[headY - 1][headX + headW] = '#ffe8a0';
  }

  // Relationships: small companion
  if (h.relationships > 0.6) {
    const compY = legY + 2;
    const compX = bodyStartX - 4;
    s[compY][compX] = '#e0a0a0';
    s[compY][compX + 1] = '#e0a0a0';
    s[compY + 1][compX] = '#e0a0a0';
    s[compY + 1][compX + 1] = '#e0a0a0';
    s[compY - 1][compX] = '#e0a0a0';
    s[compY - 1][compX + 1] = '#e0a0a0';
  }

  // Physique effects already handled via body width

  return s;
}

function fillRect(sprite, x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px >= 0 && px < 32 && py >= 0 && py < 32) {
        sprite[py][px] = color;
      }
    }
  }
}

function getPresetName(id) {
  const p = CHARACTER_PRESETS.find(p => p.id === id);
  return p ? p.name : '未知';
}

function drawCustomAvatar(canvas, imageDataUrl) {
  const ctx = canvas.getContext('2d');
  const scale = 6;
  canvas.width = 32 * scale;
  canvas.height = 32 * scale;
  ctx.imageSmoothingEnabled = false;

  const img = new Image();
  img.onload = function() {
    // Draw the image scaled to fit the canvas with pixelated rendering
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Center crop to square, then scale
    const size = Math.min(img.width, img.height);
    const sx = (img.width - size) / 2;
    const sy = (img.height - size) / 2;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
  };
  img.src = imageDataUrl;
}

function renderCharacterPortrait(canvas, data) {
  if (data.user.customAvatar) {
    drawCustomAvatar(canvas, data.user.customAvatar);
  } else {
    setCharacterPreset(data.user.characterType);
    const bmiCat = getUserBMICategory(data);
    drawCharacter(canvas, data.attributes, bmiCat.bodyMod);
  }
}
