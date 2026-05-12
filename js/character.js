// character.js — Canvas 像素小人绘制与属性联动变化

const CHARACTER_PRESETS = [
  { id: 'knight_male', name: '勇者(男)', base: 'knight', gender: 'male' },
  { id: 'knight_female', name: '勇者(女)', base: 'knight', gender: 'female' },
  { id: 'mage_male', name: '法师(男)', base: 'mage', gender: 'male' },
  { id: 'mage_female', name: '法师(女)', base: 'mage', gender: 'female' },
  { id: 'rogue_male', name: '游侠(男)', base: 'rogue', gender: 'male' },
  { id: 'rogue_female', name: '游侠(女)', base: 'rogue', gender: 'female' },
  { id: 'warrior_male', name: '战士(男)', base: 'warrior', gender: 'male' },
  { id: 'warrior_female', name: '战士(女)', base: 'warrior', gender: 'female' },
  { id: 'archer_male', name: '弓手(男)', base: 'archer', gender: 'male' },
  { id: 'archer_female', name: '弓手(女)', base: 'archer', gender: 'female' },
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
  warrior_armor: '#8a4030',
  warrior_trim: '#d0a030',
  archer_armor: '#407050',
  archer_trim: '#c0b030',
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
  const s = Array.from({ length: 32 }, () => new Array(32).fill(null));

  const preset = activePreset;
  const base = preset.base;
  const isMale = preset.gender === 'male';

  // --- Skin color by health ---
  const skinColor = h.health > 0.8 ? COLORS.skinGlow :
    h.health > 0.5 ? COLORS.skin :
    h.health > 0.3 ? COLORS.skinPale : '#d4a880';

  // --- Body width: base + physique + BMI ---
  const physiquePx = isMale ? Math.round(h.physique * 4) : Math.round(h.physique * 3);
  const bodyW = Math.max(2, Math.min(9, (isMale ? 3 : 2) + physiquePx + (bmiBodyMod || 0)));
  const bodyStartX = 16 - Math.floor(bodyW / 2) - (bodyW >= 6 ? 1 : 0);

  // --- Head ---
  const headW = isMale ? 5 : 4;
  const headH = 5;
  const headX = 16 - Math.floor(headW / 2);
  const headY = 6;

  // Face shape reflects physique/BMI
  const faceWidth = bmiBodyMod > 1 ? headW : (bmiBodyMod < -1 ? Math.max(3, headW - 1) : headW);
  const faceX = 16 - Math.floor(faceWidth / 2);

  fillRect(s, faceX, headY, faceWidth, headH, skinColor);

  // Cheek blush (health glow)
  if (h.health > 0.6) {
    const blushColor = h.health > 0.8 ? '#f0a0a0' : '#e8b0a0';
    s[headY + 2][faceX] = blushColor;
    s[headY + 2][faceX + faceWidth - 1] = blushColor;
  }

  // --- Eyes ---
  const eyeY = headY + 2;
  s[eyeY][headX + 1] = COLORS.eye_white;
  s[eyeY][headX + (headW - 2)] = COLORS.eye_white;

  // Glasses (intelligence)
  const hasGlasses = h.intelligence > 0.4;
  const hasThickGlasses = h.intelligence > 0.75;
  if (hasGlasses) {
    s[eyeY][headX] = COLORS.glasses;
    s[eyeY][headX + 2] = COLORS.glasses;
    s[eyeY][headX + (headW - 1)] = COLORS.glasses;
    s[eyeY][headX + (headW - 3)] = COLORS.glasses;
    if (hasThickGlasses) {
      s[eyeY - 1][headX] = COLORS.glasses;
      s[eyeY - 1][headX + (headW - 1)] = COLORS.glasses;
    }
  }

  // Pupils (vision high = brighter eyes)
  const eyeColor = h.vision > 0.6 ? '#2080d0' : COLORS.eye;
  s[eyeY][headX + 1] = eyeColor;
  s[eyeY][headX + (headW - 2)] = eyeColor;

  // Eyebrows (mentality high = calm brows)
  const browY = eyeY - 1;
  if (h.mentality > 0.6) {
    s[browY][headX + 1] = hairColorForPreset(base);
    s[browY][headX + (headW - 2)] = hairColorForPreset(base);
  }

  // --- Mouth ---
  const mouthY = headY + 3;
  const mouthColor = h.charm > 0.6 ? '#d04050' : '#803030';
  s[mouthY][headX + 2] = mouthColor;
  // Smile when charm is high
  if (h.charm > 0.8) {
    s[mouthY][headX + 1] = mouthColor;
    s[mouthY][headX + 3] = mouthColor;
  }

  // --- Hair ---
  const hairColor = hairColorForPreset(base);
  fillRect(s, headX - 1, headY - 1, headW + 2, 2, hairColor);
  s[headY][headX - 1] = hairColor;
  s[headY][headX + headW] = hairColor;
  s[headY + 1][headX - 1] = hairColor;
  s[headY + 1][headX + headW] = hairColor;
  // Longer hair for female
  if (!isMale) {
    s[headY + headH][headX - 1] = hairColor;
    s[headY + headH][headX + headW] = hairColor;
    if (h.physique > 0.5) {
      s[headY + headH + 1][headX - 1] = hairColor;
      s[headY + headH + 1][headX + headW] = hairColor;
    }
  }

  // --- Headgear by class ---
  if (base === 'knight') {
    // Helmet visor
    s[headY - 2][headX ] = COLORS.knight_trim;
    s[headY - 2][headX + 1] = COLORS.knight_trim;
    s[headY - 2][headX + 2] = COLORS.knight_trim;
    s[headY - 2][headX + 3] = COLORS.knight_trim;
  } else if (base === 'mage') {
    // Pointed hat
    s[headY - 2][headX] = COLORS.mage_robe;
    s[headY - 3][headX + 1] = COLORS.mage_robe;
    s[headY - 4][headX + 2] = COLORS.mage_robe;
    s[headY - 3][headX + 2] = COLORS.mage_trim;
  } else if (base === 'warrior') {
    // Horned helm
    s[headY - 2][headX - 1] = COLORS.warrior_trim;
    s[headY - 3][headX - 1] = COLORS.warrior_trim;
    s[headY - 2][headX + headW] = COLORS.warrior_trim;
    s[headY - 3][headX + headW] = COLORS.warrior_trim;
  } else if (base === 'archer') {
    // Feather cap
    s[headY - 2][headX + 2] = '#60c040';
    s[headY - 3][headX + 2] = '#60c040';
    s[headY - 4][headX + 2] = '#80e060';
  }

  // --- Torso ---
  const torsoY = headY + headH;
  const torsoH = isMale ? 7 : 6;
  const torsoColor = torsoColorForPreset(base);
  const trimColor = trimColorForPreset(base);

  // Body armor (wider for warrior, robes for mage)
  if (base === 'warrior') {
    fillRect(s, bodyStartX - 1, torsoY, bodyW + 2, torsoH, torsoColor);
    // Shoulder pauldrons
    fillRect(s, bodyStartX - 2, torsoY, 2, 3, COLORS.warrior_trim);
    fillRect(s, bodyStartX + bodyW + 1, torsoY, 2, 3, COLORS.warrior_trim);
    // Chest plate highlight
    fillRect(s, 16 - 1, torsoY + 1, 2, 2, trimColor);
  } else if (base === 'mage') {
    fillRect(s, bodyStartX - 1, torsoY, bodyW + 2, torsoH + 1, torsoColor);
    // Robe trim at bottom
    fillRect(s, bodyStartX - 1, torsoY + torsoH, bodyW + 2, 1, trimColor);
    // Star pendant
    s[torsoY + 1][16] = trimColor;
    s[torsoY + 1][15] = trimColor;
    s[torsoY + 1][17] = trimColor;
  } else if (base === 'archer') {
    fillRect(s, bodyStartX, torsoY, bodyW + 1, torsoH, torsoColor);
    // Quiver strap
    fillRect(s, 16 - 2, torsoY, 1, torsoH, COLORS.archer_trim);
  } else {
    fillRect(s, bodyStartX, torsoY, bodyW + 1, torsoH, torsoColor);
  }

  // Belt (position varies by BMI / body shape)
  const beltY = torsoY + 4 + (bmiBodyMod > 1 ? 1 : 0);
  fillRect(s, bodyStartX, beltY, bodyW + 1, 1, COLORS.belt);
  // Belt buckle
  s[beltY][16] = trimColor;

  // --- Arms ---
  const armColor = base === 'warrior' ? COLORS.warrior_trim : skinColor;
  fillRect(s, bodyStartX - 2, torsoY + 1, 2, 4, armColor);
  fillRect(s, bodyStartX + bodyW + 1, torsoY + 1, 2, 4, armColor);

  // Archer: bow on back
  if (base === 'archer') {
    const bowX = bodyStartX - 4;
    s[torsoY][bowX] = '#805030';
    s[torsoY + 1][bowX] = '#805030';
    s[torsoY + 2][bowX] = '#805030';
    s[torsoY + 3][bowX] = '#805030';
    s[torsoY + 4][bowX] = '#805030';
    // Bow curve
    s[torsoY + 1][bowX - 1] = '#a07040';
    s[torsoY + 3][bowX - 1] = '#a07040';
  }

  // Warrior: shield on left arm
  if (base === 'warrior') {
    const shieldX = bodyStartX - 3;
    fillRect(s, shieldX, torsoY + 1, 2, 3, COLORS.warrior_trim);
    s[torsoY + 2][shieldX] = torsoColor;
  }

  // --- Legs ---
  const legY = torsoY + torsoH;
  const legColor = base === 'mage' ? COLORS.mage_robe : torsoColor;
  fillRect(s, bodyStartX, legY, 2, 5, legColor);
  fillRect(s, bodyStartX + bodyW - 1, legY, 2, 5, legColor);

  // Boots
  fillRect(s, bodyStartX, legY + 5, 2, 2, COLORS.boot);
  fillRect(s, bodyStartX + bodyW - 1, legY + 5, 2, 2, COLORS.boot);

  // --- Charm sparkle effect ---
  if (h.charm > 0.4) {
    const sparkCount = h.charm > 0.8 ? 5 : h.charm > 0.6 ? 3 : 1;
    for (let i = 0; i < sparkCount; i++) {
      const sx = 16 + (i % 3 - 1) * 4;
      const sy = torsoY + 2 + Math.floor(i / 3) * 3;
      if (sx >= 0 && sx < 32 && sy >= 0 && sy < 32) {
        s[sy][sx] = '#ffe8a0';
      }
    }
  }

  // --- Wealth: crown tiers ---
  if (h.wealth > 0.7) {
    // Full crown
    s[headY - 2][headX] = COLORS.crown;
    s[headY - 2][headX + 1] = COLORS.crown;
    s[headY - 2][headX + 2] = COLORS.crown;
    s[headY - 2][headX + 3] = COLORS.crown;
    s[headY - 3][headX + 1] = COLORS.crown;
    s[headY - 3][headX + 3] = COLORS.crown;
    s[headY - 4][headX + 2] = '#ff2020'; // Ruby gem
  } else if (h.wealth > 0.5) {
    // Half crown
    s[headY - 2][headX] = COLORS.crown;
    s[headY - 2][headX + 1] = COLORS.crown;
    s[headY - 2][headX + 2] = COLORS.crown;
    s[headY - 3][headX + 1] = '#3080ff'; // Sapphire
  } else if (h.wealth > 0.25) {
    // Simple circlet
    s[headY - 2][headX + 2] = COLORS.crown;
  }

  // --- Vision: cape/wings tiered ---
  if (h.vision > 0.8) {
    // Large wings
    fillRect(s, bodyStartX - 5, torsoY + 1, 3, 5, '#80c0e0');
    fillRect(s, bodyStartX + bodyW + 3, torsoY + 1, 3, 5, '#80c0e0');
    s[torsoY][bodyStartX - 4] = '#a0d8f0';
    s[torsoY][bodyStartX + bodyW + 4] = '#a0d8f0';
  } else if (h.vision > 0.5) {
    // Cape
    s[torsoY + 1][bodyStartX - 2] = '#6090b0';
    s[torsoY + 2][bodyStartX - 3] = '#6090b0';
    s[torsoY + 3][bodyStartX - 3] = '#6090b0';
    s[torsoY + 1][bodyStartX + bodyW + 3] = '#6090b0';
    s[torsoY + 2][bodyStartX + bodyW + 4] = '#6090b0';
    s[torsoY + 3][bodyStartX + bodyW + 4] = '#6090b0';
  }

  // --- Mentality: halo and aura ---
  if (h.mentality > 0.8) {
    // Full halo + glow
    s[headY - 1][headX - 1] = '#ffe8a0';
    s[headY - 1][headX + headW] = '#ffe8a0';
    s[headY - 2][headX + 1] = '#fff0c0';
    s[headY - 2][headX + headW - 1] = '#fff0c0';
    // Ground aura
    s[legY + 7][bodyStartX] = '#ffe8a0';
    s[legY + 7][bodyStartX + bodyW - 1] = '#ffe8a0';
  } else if (h.mentality > 0.5) {
    // Simple halo
    s[headY - 1][headX - 1] = '#ffe8a0';
    s[headY - 1][headX + headW] = '#ffe8a0';
  }

  // --- Relationships: companion tiered ---
  if (h.relationships > 0.8) {
    // Larger companion
    const compY = legY + 2;
    const compX = bodyStartX - 5;
    fillRect(s, compX, compY, 3, 3, '#e0a0a0');
    s[compY - 1][compX + 1] = '#e0a0a0';
    s[compY + 3][compX] = '#c08080';
    s[compY + 3][compX + 2] = '#c08080';
  } else if (h.relationships > 0.4) {
    // Small companion
    const compY = legY + 3;
    const compX = bodyStartX - 4;
    s[compY][compX] = '#e0a0a0';
    s[compY][compX + 1] = '#e0a0a0';
    s[compY + 1][compX] = '#e0a0a0';
    s[compY + 1][compX + 1] = '#e0a0a0';
    s[compY - 1][compX] = '#e0a0a0';
    s[compY - 1][compX + 1] = '#e0a0a0';
  }

  return s;
}

function hairColorForPreset(base) {
  switch (base) {
    case 'mage': return COLORS.hair_dark;
    case 'rogue': return COLORS.hair_red;
    case 'archer': return COLORS.hair_blonde;
    default: return COLORS.hair_brown;
  }
}

function torsoColorForPreset(base) {
  switch (base) {
    case 'knight': return COLORS.knight_armor;
    case 'mage': return COLORS.mage_robe;
    case 'rogue': return COLORS.rogue_armor;
    case 'warrior': return COLORS.warrior_armor;
    case 'archer': return COLORS.archer_armor;
    default: return COLORS.knight_armor;
  }
}

function trimColorForPreset(base) {
  switch (base) {
    case 'knight': return COLORS.knight_trim;
    case 'mage': return COLORS.mage_trim;
    case 'rogue': return COLORS.rogue_trim;
    case 'warrior': return COLORS.warrior_trim;
    case 'archer': return COLORS.archer_trim;
    default: return COLORS.knight_trim;
  }
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
