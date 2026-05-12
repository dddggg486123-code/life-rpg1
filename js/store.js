// store.js — 数据模型、localStorage 读写、导出/导入

const STORAGE_KEY = 'life-rpg-data';

const ATTR_LABELS = {
  physique: '身材',
  health: '健康',
  wealth: '财富',
  intelligence: '智力',
  vision: '视野',
  charm: '魅力',
  mentality: '心态',
  relationships: '人际关系',
};

const ATTR_ICONS = {
  physique: '💪',
  health: '❤️',
  wealth: '💰',
  intelligence: '🧠',
  vision: '👁️',
  charm: '✨',
  mentality: '🧘',
  relationships: '🤝',
};

const DIFFICULTY_LABELS = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  epic: '史诗',
};

const DIFFICULTY_COLORS = {
  easy: '#4a9e4a',
  normal: '#4a7eb5',
  hard: '#c4723a',
  epic: '#9b4aca',
};

const MOOD_LABELS = {
  great: '😄 超棒',
  good: '🙂 不错',
  neutral: '😐 一般',
  bad: '😞 低落',
  terrible: '😢 很差',
};

const MOOD_COLORS = {
  great: '#4ac060',
  good: '#80c060',
  neutral: '#a0a0a0',
  bad: '#c08040',
  terrible: '#c04040',
};

const FONT_OPTIONS = [
  { id: 'pixel', name: '像素风 (Press Start 2P)', family: '"Press Start 2P", "SimHei", monospace' },
  { id: 'retro', name: '复古印刷 (VT323)', family: '"VT323", "SimHei", monospace' },
  { id: 'gothic', name: '哥特体 (MedievalSharp)', family: '"MedievalSharp", "SimHei", cursive' },
  { id: 'rpg', name: 'RPG古典 (Cinzel)', family: '"Cinzel", "SimHei", serif' },
  { id: 'clean', name: '简洁等宽 (JetBrains Mono)', family: '"JetBrains Mono", "SimHei", monospace' },
  { id: 'hand', name: '手写体 (Caveat)', family: '"Caveat", "SimHei", cursive' },
];

const DEFAULT_DATA = {
  user: {
    name: '冒险者',
    characterType: 'knight_male',
    customAvatar: '',
    fontFamily: 'pixel',
    height: 170,
    weight: 65,
  },
  attributes: {
    physique: 0,
    health: 0,
    wealth: 0,
    intelligence: 0,
    vision: 0,
    charm: 0,
    mentality: 0,
    relationships: 0,
  },
  overflow: 0,
  achievements: [],
  tasks: [],
  dailies: [],
  skills: [],
  possessions: [],
  todos: [],
  diaries: [],
  attrHistory: [],
  bookmarks: [],
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return formatDate(new Date());
}

function getWeekday() {
  return (new Date().getDay() + 6) % 7; // 0=Mon, 6=Sun
}

// --- Data Persistence ---

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { ...DEFAULT_DATA, ...data, attributes: { ...DEFAULT_DATA.attributes, ...(data.attributes || {}) }, user: { ...DEFAULT_DATA.user, ...(data.user || {}) } };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function saveData(data) {
  snapshotHistory(data);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
    alert('保存失败，请检查浏览器存储空间。');
  }
}

// --- Achievement CRUD ---

function addAchievement(data, ach) {
  const a = {
    id: generateId(),
    name: ach.name || '',
    description: ach.description || '',
    icon: ach.icon || '⭐',
    difficulty: ach.difficulty || 'normal',
    category: ach.category || '',
    rewardAttribute: ach.rewardAttribute || '',
    rewardPoints: parseInt(ach.rewardPoints) || 5,
    image: ach.image || '',
    completed: false,
    completedDate: null,
    linkedTaskId: ach.linkedTaskId || null,
  };
  data.achievements.push(a);
  saveData(data);
  return a;
}

function updateAchievement(data, id, updates) {
  const a = data.achievements.find(x => x.id === id);
  if (!a) return null;
  Object.assign(a, updates);
  saveData(data);
  return a;
}

function deleteAchievement(data, id) {
  data.achievements = data.achievements.filter(x => x.id !== id);
  // Also unlink any tasks that reference this achievement
  data.tasks.forEach(t => {
    if (t.linkedAchievementId === id) t.linkedAchievementId = null;
  });
  saveData(data);
}

function completeAchievement(data, id) {
  const a = data.achievements.find(x => x.id === id);
  if (!a || a.completed) return;
  a.completed = true;
  a.completedDate = todayStr();

  // Add reward points to the target attribute
  if (a.rewardAttribute && data.attributes.hasOwnProperty(a.rewardAttribute)) {
    const current = data.attributes[a.rewardAttribute];
    const after = current + a.rewardPoints;
    if (after > 100) {
      data.attributes[a.rewardAttribute] = 100;
      data.overflow += (after - 100);
    } else {
      data.attributes[a.rewardAttribute] = after;
    }
  } else {
    // No specific attribute → goes to overflow pool
    data.overflow += a.rewardPoints;
  }
  saveData(data);
}

function uncompleteAchievement(data, id) {
  const a = data.achievements.find(x => x.id === id);
  if (!a || !a.completed) return;
  a.completed = false;
  a.completedDate = null;

  // Remove reward points
  if (a.rewardAttribute && data.attributes.hasOwnProperty(a.rewardAttribute)) {
    const current = data.attributes[a.rewardAttribute];
    data.attributes[a.rewardAttribute] = Math.max(0, current - a.rewardPoints);
  } else {
    data.overflow = Math.max(0, data.overflow - a.rewardPoints);
  }
  saveData(data);
}

// --- Task CRUD ---

function addTask(data, task) {
  const t = {
    id: generateId(),
    name: task.name || '',
    description: task.description || '',
    difficulty: task.difficulty || 'normal',
    category: task.category || '',
    linkedAchievementId: task.linkedAchievementId || null,
    completed: false,
    completedDate: null,
  };
  data.tasks.push(t);
  saveData(data);
  return t;
}

function updateTask(data, id, updates) {
  const t = data.tasks.find(x => x.id === id);
  if (!t) return null;
  Object.assign(t, updates);
  saveData(data);
  return t;
}

function deleteTask(data, id) {
  const t = data.tasks.find(x => x.id === id);
  data.tasks = data.tasks.filter(x => x.id !== id);
  // Unlink any achievement that referenced this task
  if (t && t.linkedAchievementId) {
    const a = data.achievements.find(x => x.id === t.linkedAchievementId);
    if (a) a.linkedTaskId = null;
  }
  saveData(data);
}

function completeTask(data, id) {
  const t = data.tasks.find(x => x.id === id);
  if (!t || t.completed) return;
  t.completed = true;
  t.completedDate = todayStr();

  // If this task is linked to an achievement, auto-complete it
  if (t.linkedAchievementId) {
    const a = data.achievements.find(x => x.id === t.linkedAchievementId);
    if (a && !a.completed) {
      completeAchievement(data, a.id);
      return { taskCompleted: true, achievementCompleted: a };
    }
  }
  saveData(data);
  return { taskCompleted: true, achievementCompleted: null };
}

function uncompleteTask(data, id) {
  const t = data.tasks.find(x => x.id === id);
  if (!t || !t.completed) return;
  t.completed = false;
  t.completedDate = null;

  // Also uncomplete linked achievement
  if (t.linkedAchievementId) {
    const a = data.achievements.find(x => x.id === t.linkedAchievementId);
    if (a && a.completed) {
      uncompleteAchievement(data, a.id);
    }
  }
  saveData(data);
}

// --- Daily CRUD ---

function addDaily(data, daily) {
  const d = {
    id: generateId(),
    name: daily.name || '',
    description: daily.description || '',
    daysOfWeek: daily.daysOfWeek || [true, true, true, true, true, true, true],
    streak: 0,
    history: {},
  };
  data.dailies.push(d);
  saveData(data);
  return d;
}

function updateDaily(data, id, updates) {
  const d = data.dailies.find(x => x.id === id);
  if (!d) return null;
  Object.assign(d, updates);
  saveData(data);
  return d;
}

function deleteDaily(data, id) {
  data.dailies = data.dailies.filter(x => x.id === id);
  saveData(data);
}

function toggleDaily(data, id) {
  const d = data.dailies.find(x => x.id === id);
  if (!d) return;
  const today = todayStr();
  if (d.history[today]) {
    delete d.history[today];
  } else {
    d.history[today] = true;
  }
  // Recalculate streak
  d.streak = calcStreak(d);
  saveData(data);
}

function isDailyDoneToday(d) {
  return !!d.history[todayStr()];
}

function calcStreak(d) {
  let streak = 0;
  const today = new Date();
  // Count backwards from today
  for (let i = 0; i < 365; i++) {
    const d2 = new Date(today);
    d2.setDate(d2.getDate() - i);
    const dateStr = formatDate(d2);
    const dayOfWeek = (d2.getDay() + 6) % 7;
    if (!d.daysOfWeek[dayOfWeek]) continue; // not scheduled
    if (d.history[dateStr]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// --- Skill CRUD ---

function addSkill(data, skill) {
  const s = {
    id: generateId(),
    name: skill.name || '',
    category: skill.category || '',
    learned: skill.learned || false,
    notes: skill.notes || '',
  };
  data.skills.push(s);
  saveData(data);
  return s;
}

function updateSkill(data, id, updates) {
  const s = data.skills.find(x => x.id === id);
  if (!s) return null;
  Object.assign(s, updates);
  saveData(data);
  return s;
}

function deleteSkill(data, id) {
  data.skills = data.skills.filter(x => x.id === id);
  saveData(data);
}

function toggleSkill(data, id) {
  const s = data.skills.find(x => x.id === id);
  if (!s) return;
  s.learned = !s.learned;
  saveData(data);
}

// --- Overflow pool ---

function allocateOverflow(data, attribute, amount) {
  amount = Math.min(amount, data.overflow);
  const maxAdd = 100 - data.attributes[attribute];
  const actual = Math.min(amount, maxAdd);
  if (actual <= 0) return 0;
  data.attributes[attribute] += actual;
  data.overflow -= actual;
  saveData(data);
  return actual;
}

// --- Manual Attribute Adjustment ---

function increaseAttr(data, attribute, amount) {
  if (!data.attributes.hasOwnProperty(attribute)) return;
  const current = data.attributes[attribute];
  const actual = Math.min(amount, 100 - current);
  if (actual <= 0) return;
  data.attributes[attribute] += actual;
  saveData(data);
}

function decreaseAttr(data, attribute, amount) {
  if (!data.attributes.hasOwnProperty(attribute)) return;
  const current = data.attributes[attribute];
  const actual = Math.min(amount, current);
  if (actual <= 0) return;
  data.attributes[attribute] -= actual;
  saveData(data);
}

function setAttrValue(data, attribute, value) {
  if (!data.attributes.hasOwnProperty(attribute)) return;
  data.attributes[attribute] = Math.min(100, Math.max(0, value));
  saveData(data);
}

// --- Font ---

function applyFont(fontId) {
  const font = FONT_OPTIONS.find(f => f.id === fontId);
  if (font) {
    document.documentElement.style.setProperty('--app-font', font.family);
  }
}

// --- Export / Import ---

function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `life-rpg-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(data, jsonStr) {
  try {
    const imported = JSON.parse(jsonStr);
    // Basic validation
    if (!imported.attributes || !imported.achievements || !imported.tasks) {
      throw new Error('Invalid data format');
    }
    // Merge: imported overwrites current
    const merged = {
      ...DEFAULT_DATA,
      ...data,
      ...imported,
      attributes: { ...DEFAULT_DATA.attributes, ...(data.attributes || {}), ...(imported.attributes || {}) },
      user: { ...DEFAULT_DATA.user, ...(data.user || {}), ...(imported.user || {}) },
    };
    // Clamp attributes
    for (const key of Object.keys(merged.attributes)) {
      merged.attributes[key] = Math.min(100, Math.max(0, merged.attributes[key]));
    }
    saveData(merged);
    return merged;
  } catch (e) {
    console.error('Import failed:', e);
    return null;
  }
}

// --- Encrypted Sync (AES-256-GCM + PBKDF2, no server needed) ---

async function encryptData(data, password) {
  // Generate salt and derive key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  // Pack: salt(16) + iv(12) + ciphertext
  const packed = new Uint8Array(16 + 12 + ciphertext.byteLength);
  packed.set(salt, 0);
  packed.set(iv, 16);
  packed.set(new Uint8Array(ciphertext), 28);

  // Base64 encode for easy copy-paste
  return btoa(String.fromCharCode(...packed));
}

async function decryptData(encoded, password) {
  try {
    // Decode Base64
    const packed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    if (packed.length < 29) throw new Error('Invalid encrypted data');

    // Unpack: salt(16) + iv(12) + ciphertext
    const salt = packed.slice(0, 16);
    const iv = packed.slice(16, 28);
    const ciphertext = packed.slice(28);

    // Derive key with same salt
    const keyMaterial = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const jsonStr = new TextDecoder().decode(plaintext);
    const imported = JSON.parse(jsonStr);
    if (!imported.attributes || !imported.achievements) {
      throw new Error('Invalid data structure');
    }
    return imported;
  } catch (e) {
    console.error('Decryption failed:', e.message);
    return null;
  }
}

// --- Possessions CRUD ---

const WANTED_PRIORITY_LABELS = {
  low: '🤍 想要',
  normal: '💛 需要',
  high: '🧡 急需',
  urgent: '❤️ 必入',
};

const WANTED_PRIORITY_COLORS = {
  low: '#4a9e4a',
  normal: '#4a7eb5',
  high: '#c4723a',
  urgent: '#d04040',
};

function addPossession(data, pos) {
  const status = pos.status || 'owned';
  const p = {
    id: generateId(),
    name: pos.name || '',
    description: pos.description || '',
    image: pos.image || '',
    category: pos.category || '',
    status: status,
    purchaseDate: status === 'owned' ? (pos.purchaseDate || todayStr()) : '',
    purchasePrice: status === 'owned' ? (parseFloat(pos.purchasePrice) || 0) : 0,
    sellDate: null,
    sellPrice: null,
    targetPrice: status === 'wanted' ? (parseFloat(pos.targetPrice) || 0) : 0,
    priority: pos.priority || 'normal',
    link: pos.link || '',
  };
  data.possessions.push(p);
  saveData(data);
  return p;
}

function updatePossession(data, id, updates) {
  const p = data.possessions.find(x => x.id === id);
  if (!p) return null;
  Object.assign(p, updates);
  saveData(data);
  return p;
}

function deletePossession(data, id) {
  data.possessions = data.possessions.filter(x => x.id !== id);
  saveData(data);
}

function sellPossession(data, id, sellPrice) {
  const p = data.possessions.find(x => x.id === id);
  if (!p || p.status !== 'owned') return;
  p.status = 'sold';
  p.sellDate = todayStr();
  p.sellPrice = parseFloat(sellPrice) || 0;
  saveData(data);
}

function buyPossession(data, id, purchasePrice) {
  const p = data.possessions.find(x => x.id === id);
  if (!p || p.status !== 'wanted') return;
  p.status = 'owned';
  p.purchaseDate = todayStr();
  p.purchasePrice = parseFloat(purchasePrice) || p.targetPrice || 0;
  saveData(data);
}

function getDaysOwned(p) {
  if (p.status === 'wanted' || !p.purchaseDate) return 0;
  const start = new Date(p.purchaseDate);
  const end = p.status === 'sold' && p.sellDate ? new Date(p.sellDate) : new Date();
  return Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

function getDailyCost(p) {
  const days = getDaysOwned(p);
  if (days <= 0 || !p.purchasePrice) return 0;
  return p.purchasePrice / days;
}

function getTotalAssetValue(data) {
  return data.possessions
    .filter(p => p.status === 'owned')
    .reduce((sum, p) => sum + (p.purchasePrice || 0), 0);
}

function getWantedTotal(data) {
  return data.possessions
    .filter(p => p.status === 'wanted')
    .reduce((sum, p) => sum + (p.targetPrice || 0), 0);
}

// --- Todos CRUD ---

const TODO_PRIORITY_LABELS = {
  low: '低',
  normal: '普通',
  high: '高',
  urgent: '紧急',
};

const TODO_PRIORITY_COLORS = {
  low: '#4a9e4a',
  normal: '#4a7eb5',
  high: '#c4723a',
  urgent: '#d04040',
};

function addTodo(data, todo) {
  const t = {
    id: generateId(),
    name: todo.name || '',
    description: todo.description || '',
    priority: todo.priority || 'normal',
    category: todo.category || '',
    completed: false,
    completedDate: null,
    createdAt: todayStr(),
    dueDate: todo.dueDate || '',
  };
  data.todos.push(t);
  saveData(data);
  return t;
}

function updateTodo(data, id, updates) {
  const t = data.todos.find(x => x.id === id);
  if (!t) return null;
  Object.assign(t, updates);
  saveData(data);
  return t;
}

function deleteTodo(data, id) {
  data.todos = data.todos.filter(x => x.id === id);
  saveData(data);
}

function toggleTodo(data, id) {
  const t = data.todos.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  t.completedDate = t.completed ? todayStr() : null;
  saveData(data);
}

// --- Diary CRUD ---

function addDiary(data, entry) {
  const e = {
    id: generateId(),
    date: entry.date || todayStr(),
    title: entry.title || '',
    content: entry.content || '',
    mood: entry.mood || 'neutral',
    tags: entry.tags || [],
  };
  data.diaries.push(e);
  data.diaries.sort((a, b) => b.date.localeCompare(a.date));
  saveData(data);
  return e;
}

function updateDiary(data, id, updates) {
  const e = data.diaries.find(x => x.id === id);
  if (!e) return null;
  Object.assign(e, updates);
  if (updates.tags && typeof updates.tags === 'string') {
    e.tags = updates.tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  data.diaries.sort((a, b) => b.date.localeCompare(a.date));
  saveData(data);
  return e;
}

function deleteDiary(data, id) {
  data.diaries = data.diaries.filter(x => x.id !== id);
  saveData(data);
}

// --- Attribute History ---

function snapshotHistory(data) {
  const today = todayStr();
  const existing = data.attrHistory.find(h => h.date === today);
  const snapshot = { date: today, ...data.attributes };
  if (existing) {
    Object.assign(existing, snapshot);
  } else {
    data.attrHistory.push(snapshot);
    // Keep max 365 entries
    if (data.attrHistory.length > 365) {
      data.attrHistory = data.attrHistory.slice(-365);
    }
    data.attrHistory.sort((a, b) => a.date.localeCompare(b.date));
  }
}

function getAttrHistoryForChart(data, attribute, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days || 90));
  const cutoffStr = formatDate(cutoff);
  return data.attrHistory
    .filter(h => h.date >= cutoffStr)
    .map(h => ({ date: h.date, value: h[attribute] || 0 }));
}

function getCompletionRate(data, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days || 30));
  const cutoffStr = formatDate(cutoff);
  const completedDates = new Set();
  data.achievements.filter(a => a.completedDate && a.completedDate >= cutoffStr)
    .forEach(a => completedDates.add(a.completedDate));
  data.tasks.filter(t => t.completedDate && t.completedDate >= cutoffStr)
    .forEach(t => completedDates.add(t.completedDate));
  // Count days with daily completions
  let dailyDays = 0;
  for (const d of data.dailies) {
    for (const [date, done] of Object.entries(d.history)) {
      if (date >= cutoffStr && done) completedDates.add(date);
    }
  }
  return completedDates.size;
}

// --- Bookmarks CRUD ---

function addBookmark(data, bm) {
  const b = {
    id: generateId(),
    name: bm.name || '',
    url: bm.url || '',
    description: bm.description || '',
    category: bm.category || '',
    icon: bm.icon || '🔗',
    createdAt: todayStr(),
  };
  data.bookmarks.push(b);
  saveData(data);
  return b;
}

function updateBookmark(data, id, updates) {
  const b = data.bookmarks.find(x => x.id === id);
  if (!b) return null;
  Object.assign(b, updates);
  saveData(data);
  return b;
}

function deleteBookmark(data, id) {
  data.bookmarks = data.bookmarks.filter(x => x.id === id);
  saveData(data);
}

// --- Stats ---

function getTotalAchievements(data) {
  return data.achievements.length;
}

function getCompletedAchievements(data) {
  return data.achievements.filter(a => a.completed).length;
}

function getTotalAttributePoints(data) {
  return Object.values(data.attributes).reduce((s, v) => s + v, 0);
}

// --- BMI ---

function calcBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

function getBMICategory(bmi) {
  if (bmi === null || bmi === undefined) return { label: '未知', color: '#888', icon: '❓', bodyMod: 0 };
  if (bmi < 16)   return { label: '重度偏瘦', color: '#6090c0', icon: '🦴', bodyMod: -3 };
  if (bmi < 18.5) return { label: '偏瘦',     color: '#80b0d0', icon: '🏃', bodyMod: -1 };
  if (bmi < 24)   return { label: '标准',     color: '#4ac060', icon: '✅', bodyMod: 0 };
  if (bmi < 28)   return { label: '偏胖',     color: '#d0a040', icon: '⚠️', bodyMod: 1 };
  if (bmi < 32)   return { label: '肥胖',     color: '#d06040', icon: '🔴', bodyMod: 2 };
  return { label: '重度肥胖', color: '#c03030', icon: '🚨', bodyMod: 3 };
}

function getUserBMI(data) {
  return calcBMI(data.user.height, data.user.weight);
}

function getUserBMICategory(data) {
  return getBMICategory(getUserBMI(data));
}
