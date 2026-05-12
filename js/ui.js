// ui.js — Tab 切换、各模块渲染、表单交互、Modal 管理

let currentData = null;

// --- Helpers ---

function el(id) { return document.getElementById(id); }
function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

function iconPicker(current) {
  const icons = ['⭐','🌟','💫','🔥','💪','🧠','❤️','💰','👁️','✨','🧘','🤝','⚔️','🛡️','📚','🎓','🏆','👑','🎯','💎','🌟','⚡','🌈','🎨','🎵','🏃','🗡️','🔮','📿','🎪','🦊','🐉','🌙','☀️','💀','🎭','🏰','🗺️','✈️','🚀'];
  let html = '<div style="display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow-y:auto">';
  for (const icon of icons) {
    const sel = icon === current ? ' style="border:2px solid var(--accent);background:rgba(224,176,64,0.2)"' : '';
    html += `<button type="button" class="icon-option" data-icon="${icon}"${sel} style="font-size:24px;background:transparent;border:2px solid var(--border);cursor:pointer;padding:4px;width:36px;height:36px">${icon}</button>`;
  }
  html += '</div><input type="hidden" name="icon" value="' + (current || '⭐') + '">';
  return html;
}

// --- Modal ---

let modalCallback = null;

function showModal(title, bodyHtml, onSave) {
  modalCallback = onSave;
  const overlay = el('modal-overlay');
  const content = el('modal-content');
  content.innerHTML = `
    <div class="modal-title">${title}</div>
    <form id="modal-form">${bodyHtml}</form>
    <div class="form-actions">
      <button type="button" class="btn btn-sm" id="modal-cancel">取消</button>
      <button type="button" class="btn btn-accent btn-sm" id="modal-save">确认</button>
    </div>
  `;
  overlay.style.display = 'flex';

  el('modal-cancel').onclick = closeModal;
  overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };

  el('modal-save').onclick = function() {
    const form = el('modal-form');
    const data = {};
    form.querySelectorAll('input, select, textarea').forEach(f => {
      if (f.name) {
        if (f.type === 'checkbox') data[f.name] = f.checked;
        else if (f.type === 'number') data[f.name] = parseInt(f.value) || 0;
        else data[f.name] = f.value;
      }
    });
    // Gather day chips
    const chips = form.querySelectorAll('.day-chip.active');
    if (chips.length > 0) {
      data.daysOfWeek = [false,false,false,false,false,false,false];
      chips.forEach(c => { data.daysOfWeek[parseInt(c.dataset.day)] = true; });
    }
    if (onSave) onSave(data);
    closeModal();
  };

  // Icon picker click
  content.querySelectorAll('.icon-option').forEach(btn => {
    btn.onclick = function() {
      content.querySelectorAll('.icon-option').forEach(b => { b.style.border = '2px solid var(--border)'; b.style.background = 'transparent'; });
      this.style.border = '2px solid var(--accent)';
      this.style.background = 'rgba(224,176,64,0.2)';
      content.querySelector('input[name="icon"]').value = this.dataset.icon;
    };
  });

  // Day chips click
  content.querySelectorAll('.day-chip').forEach(chip => {
    chip.onclick = function() { this.classList.toggle('active'); };
  });

  // Achievement image file upload
  content.querySelectorAll('.ach-image-file').forEach(input => {
    input.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        showToast('图片大小不能超过 500KB', 'warning');
        this.value = '';
        return;
      }
      const reader = new FileReader();
      const hiddenInput = content.querySelector('input[name="image"]');
      reader.onload = function(ev) {
        hiddenInput.value = ev.target.result;
        // Show preview
        const preview = content.querySelector('.ach-image-preview');
        if (preview) preview.remove();
        const img = document.createElement('img');
        img.className = 'ach-image-preview';
        img.src = ev.target.result;
        img.style.cssText = 'max-width:120px;max-height:120px;border:2px solid var(--border);margin-top:6px;display:block';
        this.parentNode.insertBefore(img, this.nextSibling);
      }.bind(this);
      reader.readAsDataURL(file);
    };
  });

  // Possession image file upload
  content.querySelectorAll('.pos-image-file').forEach(input => {
    input.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        showToast('图片大小不能超过 500KB', 'warning');
        this.value = '';
        return;
      }
      const reader = new FileReader();
      const hiddenInput = content.querySelector('input[name="image"]');
      reader.onload = function(ev) {
        hiddenInput.value = ev.target.result;
        const preview = content.querySelector('.pos-image-preview');
        if (preview) preview.remove();
        const img = document.createElement('img');
        img.className = 'pos-image-preview';
        img.src = ev.target.result;
        img.style.cssText = 'max-width:120px;max-height:120px;border:2px solid var(--border);margin-top:6px;display:block';
        this.parentNode.insertBefore(img, this.nextSibling);
      }.bind(this);
      reader.readAsDataURL(file);
    };
  });
}

function closeModal() {
  el('modal-overlay').style.display = 'none';
  modalCallback = null;
}

// --- Level Bar Update ---

function updateLevelBar(data) {
  const total = getTotalAttributePoints(data);
  const lvl = getLevel(total);
  el('level-icon').textContent = getLevelIcon(lvl.level);
  el('level-num').textContent = lvl.level;
  el('level-title').textContent = lvl.title;
  el('xp-bar-fill').style.width = lvl.xpProgress + '%';
  el('xp-current').textContent = lvl.xp;
  el('xp-next').textContent = lvl.xpNext;
}

// --- Character Tab ---

function renderCharacterTab(data) {
  // Update level bar
  updateLevelBar(data);

  // Preset selector
  const select = el('char-preset-select');
  select.innerHTML = CHARACTER_PRESETS.map(p =>
    `<option value="${p.id}" ${data.user.characterType === p.id ? 'selected' : ''}>${p.name}</option>`
  ).join('');
  select.onchange = function() {
    data.user.characterType = this.value;
    setCharacterPreset(this.value);
    saveData(data);
    renderAll(data);
  };

  // Name input
  const nameInput = el('char-name');
  nameInput.value = data.user.name;
  nameInput.onchange = function() {
    data.user.name = this.value || '冒险者';
    saveData(data);
  };

  // Canvas (must be defined before BMI block uses it)
  const canvas = el('char-canvas');

  // Height & Weight with BMI
  const heightInput = el('char-height');
  const weightInput = el('char-weight');
  const bmiDisplay = el('bmi-display');
  if (heightInput && weightInput && bmiDisplay) {
    heightInput.value = data.user.height || 170;
    weightInput.value = data.user.weight || 65;

    function updateBMI() {
      const h = parseFloat(heightInput.value) || 0;
      const w = parseFloat(weightInput.value) || 0;
      data.user.height = h;
      data.user.weight = w;
      const bmi = calcBMI(h, w);
      const cat = getBMICategory(bmi);
      if (bmi) {
        bmiDisplay.innerHTML = cat.icon + ' BMI: ' + bmi.toFixed(1) + ' (' + cat.label + ')';
        bmiDisplay.style.color = cat.color;
      } else {
        bmiDisplay.innerHTML = '❓ 请输入身高体重';
        bmiDisplay.style.color = 'var(--text-dim)';
      }
      saveData(data);
      // Only redraw pixel character if using preset (BMI affects body shape)
      if (!data.user.customAvatar) {
        setCharacterPreset(data.user.characterType);
        drawCharacter(canvas, data.attributes, cat.bodyMod);
      }
    }

    heightInput.oninput = updateBMI;
    weightInput.oninput = updateBMI;
    // Initial BMI display
    updateBMI();
  }

  // Draw character
  renderCharacterPortrait(canvas, data);

  // Avatar upload
  const uploadBtn = el('btn-upload-avatar');
  const avatarUpload = el('avatar-upload');
  if (uploadBtn && avatarUpload) {
    uploadBtn.onclick = function() { avatarUpload.click(); };
  }
  if (avatarUpload) {
    avatarUpload.onchange = function(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        showToast('图片大小不能超过 500KB', 'warning');
        this.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = function(ev) {
        data.user.customAvatar = ev.target.result;
        saveData(data);
        renderCharacterPortrait(canvas, data);
      };
      reader.readAsDataURL(file);
      this.value = '';
    };
  }

  // Clear avatar button
  const clearAvatarBtn = el('btn-clear-avatar');
  if (clearAvatarBtn) {
    clearAvatarBtn.style.display = data.user.customAvatar ? 'inline-block' : 'none';
    clearAvatarBtn.onclick = function() {
      data.user.customAvatar = '';
      saveData(data);
      renderCharacterPortrait(canvas, data);
      clearAvatarBtn.style.display = 'none';
    };
  }

  // Font selector
  const fontSelect = el('font-select');
  if (fontSelect) {
    fontSelect.innerHTML = FONT_OPTIONS.map(f =>
      `<option value="${f.id}" ${data.user.fontFamily === f.id ? 'selected' : ''}>${f.name}</option>`
    ).join('');
    fontSelect.onchange = function() {
      data.user.fontFamily = this.value;
      applyFont(this.value);
      saveData(data);
    };
  }

  // Attribute overview bars
  renderAttrOverview(data);

  // Dashboard cards
  var totalAttr = getTotalAttributePoints(data);
  var lvl = getLevel(totalAttr);
  var statsRow = qs('.stats-row', qs('#tab-character'));
  if (statsRow) {
    statsRow.innerHTML =
      '<div class="dash-card pixel-card">' +
        '<div class="dash-icon">' + getLevelIcon(lvl.level) + '</div>' +
        '<div class="dash-val">Lv.' + lvl.level + '</div>' +
        '<div class="dash-label">' + lvl.title + '</div>' +
      '</div>' +
      '<div class="dash-card pixel-card highlight">' +
        '<div class="dash-icon">⭐</div>' +
        '<div class="dash-val">' + totalAttr + '</div>' +
        '<div class="dash-label">总属性点</div>' +
      '</div>' +
      '<div class="dash-card pixel-card">' +
        '<div class="dash-icon">🏆</div>' +
        '<div class="dash-val">' + getCompletedAchievements(data) + '/' + getTotalAchievements(data) + '</div>' +
        '<div class="dash-label">成就进度</div>' +
      '</div>' +
      '<div class="dash-card pixel-card">' +
        '<div class="dash-icon">📋</div>' +
        '<div class="dash-val">' + data.tasks.filter(function(t) { return t.completed; }).length + '/' + data.tasks.length + '</div>' +
        '<div class="dash-label">任务完成</div>' +
      '</div>' +
      '<div class="dash-card pixel-card">' +
        '<div class="dash-icon">🔥</div>' +
        '<div class="dash-val">' + Math.max.apply(null, data.dailies.map(function(d) { return d.streak; }).concat([0])) + '</div>' +
        '<div class="dash-label">最高连续</div>' +
      '</div>' +
      '<div class="dash-card pixel-card">' +
        '<div class="dash-icon">📖</div>' +
        '<div class="dash-val">' + data.diaries.length + '</div>' +
        '<div class="dash-label">日记数</div>' +
      '</div>';
  }
}

function renderAttrOverview(data) {
  const container = el('attr-overview-list');
  const attrs = data.attributes;
  let html = '';
  for (const [key, val] of Object.entries(attrs)) {
    html += `
      <div class="attr-row">
        <div class="attr-icon">${ATTR_ICONS[key]}</div>
        <div class="attr-label">${ATTR_LABELS[key]}</div>
        <div class="attr-bar-wrap">
          <div class="attr-bar-fill ${key}" style="width:${val}%"></div>
        </div>
        <div class="attr-value">${val}/100</div>
      </div>`;
  }
  container.innerHTML = html;
}

// --- Attributes Tab ---

function renderAttributesTab(data) {
  const container = el('attr-detail-list');
  let html = '';
  for (const [key, val] of Object.entries(data.attributes)) {
    const pct = val;
    html += `
      <div class="attr-row" style="padding:10px 0;flex-wrap:wrap;gap:4px">
        <div class="attr-icon">${ATTR_ICONS[key]}</div>
        <div class="attr-label">${ATTR_LABELS[key]}</div>
        <div class="attr-bar-wrap" style="height:24px;min-width:100px">
          <div class="attr-bar-fill ${key}" style="width:${pct}%"></div>
        </div>
        <div class="attr-value" style="font-family:'Press Start 2P','SimHei',monospace;font-size:11px;min-width:70px">${val}/100</div>
        <div style="display:flex;gap:2px;flex-shrink:0">
          <button class="btn btn-sm attr-minus10-btn" data-attr="${key}" title="-10" ${val < 10 ? 'disabled' : ''}>−10</button>
          <button class="btn btn-sm attr-minus5-btn" data-attr="${key}" title="-5" ${val < 5 ? 'disabled' : ''}>−5</button>
          <button class="btn btn-sm attr-minus-btn" data-attr="${key}" title="-1" ${val <= 0 ? 'disabled' : ''}>−</button>
          <button class="btn btn-sm attr-plus-btn" data-attr="${key}" title="+1" ${val >= 100 ? 'disabled' : ''}>+</button>
          <button class="btn btn-sm attr-plus5-btn" data-attr="${key}" title="+5" ${val >= 100 ? 'disabled' : ''}>+5</button>
          <button class="btn btn-sm attr-plus10-btn" data-attr="${key}" title="+10" ${val >= 100 ? 'disabled' : ''}>+10</button>
        </div>
      </div>`;
  }
  container.innerHTML = html;

  // +/- button event handlers
  container.querySelectorAll('.attr-minus10-btn').forEach(btn => {
    btn.onclick = function() {
      decreaseAttr(data, this.dataset.attr, 10);
      renderAll(data);
    };
  });
  container.querySelectorAll('.attr-minus5-btn').forEach(btn => {
    btn.onclick = function() {
      decreaseAttr(data, this.dataset.attr, 5);
      renderAll(data);
    };
  });
  container.querySelectorAll('.attr-minus-btn').forEach(btn => {
    btn.onclick = function() {
      decreaseAttr(data, this.dataset.attr, 1);
      renderAll(data);
    };
  });
  container.querySelectorAll('.attr-plus-btn').forEach(btn => {
    btn.onclick = function() {
      increaseAttr(data, this.dataset.attr, 1);
      renderAll(data);
    };
  });
  container.querySelectorAll('.attr-plus5-btn').forEach(btn => {
    btn.onclick = function() {
      increaseAttr(data, this.dataset.attr, 5);
      renderAll(data);
    };
  });
  container.querySelectorAll('.attr-plus10-btn').forEach(btn => {
    btn.onclick = function() {
      increaseAttr(data, this.dataset.attr, 10);
      renderAll(data);
    };
  });

  // Overflow pool
  const pool = el('overflow-pool');
  if (data.overflow > 0) {
    pool.style.display = 'block';
    el('overflow-amount').textContent = data.overflow;

    const target = el('overflow-target');
    target.innerHTML = Object.entries(ATTR_LABELS)
      .map(([k, v]) => `<option value="${k}">${ATTR_ICONS[k]} ${v} (${data.attributes[k]}/100)</option>`)
      .join('');

    el('btn-allocate').onclick = function() {
      const attr = target.value;
      const result = allocateOverflow(data, attr, 1);
      if (result > 0) {
        renderAll(data);
      }
    };
  } else {
    pool.style.display = 'none';
  }
}

// --- Achievements Tab ---

function renderAchievementsTab(data) {
  const diffFilter = el('ach-filter-diff').value;
  const statusFilter = el('ach-filter-status').value;

  let list = [...data.achievements];
  if (diffFilter !== 'all') list = list.filter(a => a.difficulty === diffFilter);
  if (statusFilter === 'completed') list = list.filter(a => a.completed);
  if (statusFilter === 'uncompleted') list = list.filter(a => !a.completed);

  const grid = el('achievement-list');
  const empty = el('ach-empty');

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.style.display = data.achievements.length === 0 ? 'block' : 'none';
    if (data.achievements.length > 0 && list.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px">没有符合条件的成就</p>';
    }
  } else {
    empty.style.display = 'none';
    grid.innerHTML = list.map(a => {
      const linkedTask = a.linkedTaskId ? data.tasks.find(t => t.id === a.linkedTaskId) : null;
      return `
        <div class="pixel-card achievement-card ${a.completed ? 'completed' : ''}">
          <div class="ach-icon">${a.icon || '⭐'}</div>
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.description || ''}</div>
          ${a.image ? `<div style="margin:8px 0"><img src="${a.image}" style="max-width:100%;max-height:160px;border:2px solid var(--border)" loading="lazy"></div>` : ''}
          <div class="ach-meta">
            <span class="ach-difficulty" style="color:${DIFFICULTY_COLORS[a.difficulty]}">${DIFFICULTY_LABELS[a.difficulty]}</span>
            ${a.category ? `<span class="ach-category">${a.category}</span>` : ''}
            ${a.rewardAttribute ? `<span class="ach-reward">${ATTR_ICONS[a.rewardAttribute]} +${a.rewardPoints}</span>` : ''}
          </div>
          ${linkedTask ? `<div style="font-size:9px;color:var(--text-dim);margin-top:6px">📋 关联任务: ${linkedTask.name}</div>` : ''}
          ${a.completed ? `<div class="ach-completed-badge">✓ 已完成 ${a.completedDate}</div>` : ''}
          <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
            ${!a.completed ? `<button class="btn btn-success btn-sm ach-complete-btn" data-id="${a.id}">完成</button>` : `<button class="btn btn-sm ach-undo-btn" data-id="${a.id}">撤销</button>`}
            <button class="btn btn-sm ach-edit-btn" data-id="${a.id}">编辑</button>
            <button class="btn btn-danger btn-sm ach-delete-btn" data-id="${a.id}">删除</button>
          </div>
        </div>`;
    }).join('');
  }
}

function showAchievementModal(data, ach) {
  const isEdit = !!ach;
  const title = isEdit ? '编辑成就' : '新成就';
  const defaults = ach || { name: '', description: '', icon: '⭐', difficulty: 'normal', category: '', rewardAttribute: '', rewardPoints: 5 };

  const attrOpts = Object.entries(ATTR_LABELS).map(([k, v]) =>
    `<option value="${k}" ${defaults.rewardAttribute === k ? 'selected' : ''}>${ATTR_ICONS[k]} ${v}</option>`
  ).join('');

  const diffOpts = Object.entries(DIFFICULTY_LABELS).map(([k, v]) =>
    `<option value="${k}" ${defaults.difficulty === k ? 'selected' : ''}>${v}</option>`
  ).join('');

  const taskOpts = data.tasks.map(t =>
    `<option value="${t.id}" ${defaults.linkedTaskId === t.id ? 'selected' : ''}>${t.name}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label>图标</label>
      ${iconPicker(defaults.icon)}
    </div>
    <div class="form-group">
      <label>名称</label>
      <input type="text" name="name" value="${defaults.name}" required maxlength="30">
    </div>
    <div class="form-group">
      <label>描述</label>
      <textarea name="description" maxlength="200">${defaults.description}</textarea>
    </div>
    <div class="form-group">
      <label>记录图片（可选，上传当前状态的截图）</label>
      <input type="file" class="ach-image-file" accept="image/*" style="font-size:11px;padding:4px">
      ${defaults.image ? `<div style="margin-top:6px"><img src="${defaults.image}" style="max-width:120px;max-height:120px;border:2px solid var(--border)"></div>` : ''}
      <input type="hidden" name="image" value="${defaults.image || ''}">
    </div>
    <div class="form-group">
      <label>难度</label>
      <select name="difficulty">${diffOpts}</select>
    </div>
    <div class="form-group">
      <label>分类标签</label>
      <input type="text" name="category" value="${defaults.category}" maxlength="20" placeholder="如: 学习、健身、社交">
    </div>
    <div class="form-group">
      <label>奖励归属属性</label>
      <select name="rewardAttribute">
        <option value="">不指定（进溢出池）</option>
        ${attrOpts}
      </select>
    </div>
    <div class="form-group">
      <label>奖励点数</label>
      <input type="number" name="rewardPoints" value="${defaults.rewardPoints}" min="1" max="100">
    </div>
    <div class="form-group">
      <label>关联任务（可选，任务完成时自动完成此成就）</label>
      <select name="linkedTaskId">
        <option value="">不关联</option>
        ${taskOpts}
      </select>
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateAchievement(data, ach.id, formData);
    } else {
      addAchievement(data, formData);
    }
    renderAll(data);
  });
}

// --- Tasks Tab ---

function renderTasksTab(data) {
  const list = el('task-list');
  const empty = el('task-empty');

  if (data.tasks.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    // Sort: uncompleted first
    const sorted = [...data.tasks].sort((a, b) => a.completed - b.completed);
    list.innerHTML = sorted.map(t => {
      const linkedAch = t.linkedAchievementId ? data.achievements.find(a => a.id === t.linkedAchievementId) : null;
      return `
        <div class="pixel-card task-item ${t.completed ? 'completed' : ''}">
          <div class="task-check" data-id="${t.id}" title="${t.completed ? '撤销' : '完成'}">
            ${t.completed ? '✓' : ''}
          </div>
          <div class="task-info">
            <div class="task-name">${t.name}</div>
            <div class="task-desc">${t.description || ''}</div>
            <div style="font-size:9px;color:var(--text-dim);margin-top:4px">
              ${DIFFICULTY_LABELS[t.difficulty]} ${t.category ? '· ' + t.category : ''}
              ${linkedAch ? '· 🏅 ' + linkedAch.name : ''}
              ${t.completed ? '· 完成于 ' + t.completedDate : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="btn btn-sm task-edit-btn" data-id="${t.id}">编辑</button>
            <button class="btn btn-danger btn-sm task-delete-btn" data-id="${t.id}">删除</button>
          </div>
        </div>`;
    }).join('');
  }
}

function showTaskModal(data, task) {
  const isEdit = !!task;
  const title = isEdit ? '编辑任务' : '新任务';
  const defaults = task || { name: '', description: '', difficulty: 'normal', category: '', linkedAchievementId: '' };

  const diffOpts = Object.entries(DIFFICULTY_LABELS).map(([k, v]) =>
    `<option value="${k}" ${defaults.difficulty === k ? 'selected' : ''}>${v}</option>`
  ).join('');

  const achOpts = data.achievements.map(a =>
    `<option value="${a.id}" ${defaults.linkedAchievementId === a.id ? 'selected' : ''}>${a.icon} ${a.name} ${a.completed ? '(已完成)' : ''}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label>名称</label>
      <input type="text" name="name" value="${defaults.name}" required maxlength="40">
    </div>
    <div class="form-group">
      <label>描述</label>
      <textarea name="description" maxlength="200">${defaults.description}</textarea>
    </div>
    <div class="form-group">
      <label>难度</label>
      <select name="difficulty">${diffOpts}</select>
    </div>
    <div class="form-group">
      <label>分类标签</label>
      <input type="text" name="category" value="${defaults.category}" maxlength="20">
    </div>
    <div class="form-group">
      <label>关联成就（完成后自动解锁该成就）</label>
      <select name="linkedAchievementId">
        <option value="">不关联</option>
        ${achOpts}
      </select>
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateTask(data, task.id, formData);
    } else {
      addTask(data, formData);
    }
    renderAll(data);
  });
}

// --- Dailies Tab ---

function renderDailiesTab(data) {
  const list = el('daily-list');
  const empty = el('daily-empty');
  const today = getWeekday();
  const todayDailies = data.dailies.filter(d => d.daysOfWeek[today]);

  if (data.dailies.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    // Show today's dailies first, then rest
    const sorted = [...data.dailies].sort((a, b) => {
      const aToday = a.daysOfWeek[today] ? 0 : 1;
      const bToday = b.daysOfWeek[today] ? 0 : 1;
      return aToday - bToday;
    });

    list.innerHTML = sorted.map(d => {
      const done = isDailyDoneToday(d);
      const isToday = d.daysOfWeek[today];
      const streakFire = d.streak >= 7;

      const dayNames = ['一','二','三','四','五','六','日'];
      const daysStr = d.daysOfWeek.map((on, i) => on ? dayNames[i] : '·').join(' ');

      return `
        <div class="pixel-card daily-item ${done ? 'completed' : ''}" style="${isToday ? '' : 'opacity:0.5'}">
          <div class="daily-check" data-id="${d.id}" title="${done ? '撤销' : '完成'}">
            ${done ? '✓' : ''}
          </div>
          <div class="daily-info">
            <div class="daily-name">${d.name} ${isToday ? '<span style="font-size:9px;color:var(--accent)">[今日]</span>' : ''}</div>
            <div class="daily-desc">${d.description || ''}</div>
            <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${daysStr}</div>
          </div>
          <div style="text-align:right">
            <span class="streak-badge ${streakFire ? 'fire' : ''}">🔥 ${d.streak}</span>
            <div class="daily-actions" style="margin-top:6px">
              <button class="btn btn-sm daily-edit-btn" data-id="${d.id}">编辑</button>
              <button class="btn btn-danger btn-sm daily-delete-btn" data-id="${d.id}">删除</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }
}

function showDailyModal(data, daily) {
  const isEdit = !!daily;
  const title = isEdit ? '编辑日常' : '新日常';
  const defaults = daily || { name: '', description: '', daysOfWeek: [true, true, true, true, true, true, true] };

  const dayNames = ['一','二','三','四','五','六','日'];
  const dayChips = dayNames.map((n, i) => {
    const active = defaults.daysOfWeek[i] ? ' active' : '';
    return `<span class="day-chip${active}" data-day="${i}">${n}</span>`;
  }).join('');

  const body = `
    <div class="form-group">
      <label>名称</label>
      <input type="text" name="name" value="${defaults.name}" required maxlength="30">
    </div>
    <div class="form-group">
      <label>描述</label>
      <textarea name="description" maxlength="200">${defaults.description}</textarea>
    </div>
    <div class="form-group">
      <label>重复日</label>
      <div class="days-selector">${dayChips}</div>
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateDaily(data, daily.id, formData);
    } else {
      addDaily(data, formData);
    }
    renderAll(data);
  });
}

// --- Skills Tab ---

function renderSkillsTab(data) {
  const list = el('skill-list');
  const empty = el('skill-empty');

  if (data.skills.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    // Group by category
    const catMap = {};
    data.skills.forEach(s => {
      const cat = s.category || '未分类';
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(s);
    });

    let html = '';
    for (const [cat, skills] of Object.entries(catMap)) {
      html += `<h3 style="color:var(--accent);margin-top:12px;margin-bottom:8px">📁 ${cat} (${skills.filter(s => s.learned).length}/${skills.length})</h3>`;
      skills.forEach(s => {
        html += `
          <div class="pixel-card skill-item ${s.learned ? '' : ''}" style="${!s.learned ? 'opacity:0.65' : ''}">
            <div class="task-check" data-skill-id="${s.id}" title="切换已学/未学">
              ${s.learned ? '✓' : ''}
            </div>
            <div class="skill-info">
              <div class="skill-name">${s.name}</div>
              ${s.notes ? `<div class="skill-desc">${s.notes}</div>` : ''}
            </div>
            <div style="font-size:9px;color:${s.learned ? 'var(--success)' : 'var(--text-dim)'}">
              ${s.learned ? '已掌握' : '未学'}
            </div>
            <div class="skill-actions">
              <button class="btn btn-sm skill-edit-btn" data-id="${s.id}">编辑</button>
              <button class="btn btn-danger btn-sm skill-delete-btn" data-id="${s.id}">删除</button>
            </div>
          </div>`;
      });
    }
    list.innerHTML = html;
  }
}

function showSkillModal(data, skill) {
  const isEdit = !!skill;
  const title = isEdit ? '编辑技能' : '新技能';
  const defaults = skill || { name: '', category: '', learned: false, notes: '' };

  const body = `
    <div class="form-group">
      <label>名称</label>
      <input type="text" name="name" value="${defaults.name}" required maxlength="30">
    </div>
    <div class="form-group">
      <label>分类</label>
      <input type="text" name="category" value="${defaults.category}" maxlength="20" placeholder="如: 编程、语言、运动">
    </div>
    <div class="form-group">
      <label>备注</label>
      <textarea name="notes" maxlength="200">${defaults.notes}</textarea>
    </div>
    <div class="form-group">
      <label>
        <input type="checkbox" name="learned" ${defaults.learned ? 'checked' : ''}> 已掌握
      </label>
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateSkill(data, skill.id, formData);
    } else {
      addSkill(data, formData);
    }
    renderAll(data);
  });
}

// --- Chart Engine ---

function drawLineChart(canvas, dataPoints, attrKey, period) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width - 16;
  const h = 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;

  const pad = { top: 20, right: 20, bottom: 30, left: 45 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;

  // Background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (ph / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    // Y labels
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(100 - (100 / 4) * i), pad.left - 6, y + 3);
  }

  // X labels (dates)
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(dataPoints.length / 6));
  for (let i = 0; i < dataPoints.length; i += step) {
    const x = pad.left + (pw / Math.max(1, dataPoints.length - 1)) * i;
    ctx.fillStyle = '#666';
    ctx.fillText(dataPoints[i].date.slice(5), x, h - pad.bottom + 14);
  }

  if (dataPoints.length < 2) {
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('数据不足，需要至少 2 天的记录', w / 2, h / 2);
    return;
  }

  // Line
  const colorMap = {
    physique: '#e06060', health: '#e06080', wealth: '#e0c030',
    intelligence: '#6060e0', vision: '#60a0c0', charm: '#e060c0',
    mentality: '#60c060', relationships: '#c0a060',
  };
  const color = colorMap[attrKey] || '#e0b040';

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let i = 0; i < dataPoints.length; i++) {
    const x = pad.left + (pw / (dataPoints.length - 1)) * i;
    const y = pad.top + ph - (dataPoints[i].value / 100) * ph;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Dots
  for (let i = 0; i < dataPoints.length; i++) {
    const x = pad.left + (pw / (dataPoints.length - 1)) * i;
    const y = pad.top + ph - (dataPoints[i].value / 100) * ph;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, i === dataPoints.length - 1 ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Diary Tab ---

function renderDiaryTab(data) {
  const list = el('diary-list');
  const empty = el('diary-empty');
  const moodFilter = el('diary-filter-mood').value;
  const searchText = (el('diary-search').value || '').toLowerCase();

  let filtered = [...data.diaries];
  if (moodFilter !== 'all') filtered = filtered.filter(d => d.mood === moodFilter);
  if (searchText) {
    filtered = filtered.filter(d =>
      d.title.toLowerCase().includes(searchText) ||
      d.content.toLowerCase().includes(searchText) ||
      (d.tags || []).some(t => t.toLowerCase().includes(searchText))
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = data.diaries.length === 0 ? 'block' : 'none';
    if (data.diaries.length > 0 && filtered.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px">没有找到匹配的日记</p>';
    }
  } else {
    empty.style.display = 'none';
    list.innerHTML = filtered.map(d => {
      const moodEmoji = MOOD_LABELS[d.mood] || '';
      const weekDay = ['日','一','二','三','四','五','六'][new Date(d.date).getDay()];
      const tagsHtml = (d.tags || []).map(t => `<span style="padding:1px 6px;background:rgba(255,255,255,0.05);font-size:9px">#${t}</span>`).join(' ');
      return `
        <div class="pixel-card diary-entry" style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
            <div style="flex:1;min-width:180px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:20px">${moodEmoji.split(' ')[0]}</span>
                <span class="task-name">${d.title || '无标题'}</span>
              </div>
              ${d.content ? `<div class="task-desc" style="white-space:pre-wrap">${d.content}</div>` : ''}
              ${tagsHtml ? `<div style="margin-top:6px">${tagsHtml}</div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:9px;color:var(--text-dim)">📅 ${d.date} 周${weekDay}</div>
              <div class="daily-actions" style="margin-top:4px">
                <button class="btn btn-sm diary-edit-btn" data-id="${d.id}">编辑</button>
                <button class="btn btn-danger btn-sm diary-delete-btn" data-id="${d.id}">删除</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }
}

function showDiaryModal(data, diary) {
  const isEdit = !!diary;
  const title = isEdit ? '编辑日记' : '写日记';
  const defaults = diary || { title: '', content: '', mood: 'neutral', date: todayStr(), tags: '' };

  const moodOpts = Object.entries(MOOD_LABELS).map(([k, v]) =>
    `<option value="${k}" ${defaults.mood === k ? 'selected' : ''}>${v}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label>日期</label>
      <input type="date" name="date" value="${defaults.date}">
    </div>
    <div class="form-group">
      <label>标题</label>
      <input type="text" name="title" value="${defaults.title}" maxlength="40" placeholder="今天的主题...">
    </div>
    <div class="form-group">
      <label>心情</label>
      <select name="mood">${moodOpts}</select>
    </div>
    <div class="form-group">
      <label>内容</label>
      <textarea name="content" maxlength="3000" style="min-height:120px" placeholder="今天发生了什么？有什么收获和反思？"></textarea>
    </div>
    <div class="form-group">
      <label>标签（逗号分隔）</label>
      <input type="text" name="tags" value="${(defaults.tags || []).join(', ')}" maxlength="100" placeholder="如: 锻炼, 学习, 社交">
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateDiary(data, diary.id, formData);
    } else {
      addDiary(data, formData);
    }
    renderAll(data);
  });
}

// --- Bookmarks Tab ---

function renderBookmarksTab(data) {
  const list = el('bookmark-list');
  const empty = el('bookmark-empty');
  const catFilter = el('bm-filter-cat');

  // Build category filter options
  const cats = [...new Set(data.bookmarks.map(b => b.category).filter(Boolean))];
  catFilter.innerHTML = '<option value="all">全部分类</option>' +
    cats.map(c => `<option value="${c}" ${catFilter.value === c ? 'selected' : ''}>${c}</option>`).join('');

  const filterCat = catFilter.value;
  let filtered = [...data.bookmarks];
  if (filterCat && filterCat !== 'all') {
    filtered = filtered.filter(b => b.category === filterCat);
  }

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = data.bookmarks.length === 0 ? 'block' : 'none';
    if (data.bookmarks.length > 0 && filtered.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px">没有符合条件的收藏</p>';
    }
  } else {
    empty.style.display = 'none';
    list.innerHTML = filtered.map(b => `
      <div class="pixel-card bookmark-item" style="margin-bottom:8px">
        <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div style="width:48px;height:48px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px;background:#111;flex-shrink:0">${b.icon || '🔗'}</div>
          <div style="flex:1;min-width:180px">
            <a href="${b.url}" target="_blank" rel="noopener" class="task-name" style="text-decoration:none;color:var(--accent)">${b.name} 🔗</a>
            ${b.description ? `<div class="task-desc">${b.description}</div>` : ''}
            <div style="font-size:9px;color:var(--text-dim);margin-top:4px;display:flex;flex-wrap:wrap;gap:8px">
              ${b.category ? `<span>🏷️ ${b.category}</span>` : ''}
              <span>📅 ${b.createdAt}</span>
            </div>
          </div>
          <div class="task-actions" style="flex-shrink:0">
            <button class="btn btn-sm bm-edit-btn" data-id="${b.id}">编辑</button>
            <button class="btn btn-danger btn-sm bm-delete-btn" data-id="${b.id}">删除</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  catFilter.onchange = function() { renderBookmarksTab(data); };
}

function showBookmarkModal(data, bm) {
  const isEdit = !!bm;
  const title = isEdit ? '编辑收藏' : '新收藏';
  const defaults = bm || { name: '', url: '', description: '', category: '', icon: '🔗' };

  const body = `
    <div class="form-group">
      <label>图标</label>
      ${iconPicker(defaults.icon)}
    </div>
    <div class="form-group">
      <label>名称</label>
      <input type="text" name="name" value="${defaults.name}" required maxlength="30">
    </div>
    <div class="form-group">
      <label>网址 (URL)</label>
      <input type="url" name="url" value="${defaults.url}" required placeholder="https://..." maxlength="500">
    </div>
    <div class="form-group">
      <label>描述</label>
      <textarea name="description" maxlength="200">${defaults.description}</textarea>
    </div>
    <div class="form-group">
      <label>分类标签</label>
      <input type="text" name="category" value="${defaults.category}" maxlength="20" placeholder="如: 工具、学习、娱乐">
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateBookmark(data, bm.id, formData);
    } else {
      addBookmark(data, formData);
    }
    renderAll(data);
  });
}

// --- Encrypted Sync Modal ---

function showSyncModal(data) {
  const body = `
    <div style="margin-bottom:16px;padding:10px;background:rgba(224,176,64,0.08);border:2px solid var(--accent);font-size:9px;color:var(--accent)">
      ⚠️ 请记住你的密码。密码不会存储在任何地方，丢失后无法恢复数据。
    </div>
    <div class="pixel-box" style="margin-bottom:12px">
      <h3 style="color:var(--accent);margin-bottom:10px">📤 本设备 → 其他设备</h3>
      <div class="form-group">
        <label>设置/输入同步密码</label>
        <input type="password" id="sync-password-export" placeholder="输入密码..." style="font-family:'Press Start 2P','SimHei',monospace;font-size:11px">
      </div>
      <div class="form-group">
        <label>确认密码</label>
        <input type="password" id="sync-password-export2" placeholder="再次输入密码..." style="font-family:'Press Start 2P','SimHei',monospace;font-size:11px">
      </div>
      <button type="button" class="btn btn-accent btn-sm" id="sync-encrypt-btn" style="width:100%">🔒 加密并复制到剪贴板</button>
      <div id="sync-encrypt-status" style="margin-top:8px;font-size:10px;text-align:center"></div>
    </div>
    <div class="pixel-box">
      <h3 style="color:var(--info);margin-bottom:10px">📥 其他设备 → 本设备</h3>
      <div class="form-group">
        <label>粘贴加密编码</label>
        <textarea id="sync-paste-area" placeholder="在此粘贴加密编码..." style="font-family:monospace;font-size:10px;min-height:60px;word-break:break-all"></textarea>
      </div>
      <div class="form-group">
        <label>输入同步密码</label>
        <input type="password" id="sync-password-import" placeholder="输入加密时设置的密码..." style="font-family:'Press Start 2P','SimHei',monospace;font-size:11px">
      </div>
      <button type="button" class="btn btn-info btn-sm" id="sync-decrypt-btn" style="width:100%">🔓 解密并导入数据</button>
      <div id="sync-decrypt-status" style="margin-top:8px;font-size:10px;text-align:center"></div>
    </div>
  `;

  showModal('设备同步', body, null);

  // Wire up encrypt button
  el('sync-encrypt-btn').onclick = async function() {
    const pw = el('sync-password-export').value;
    const pw2 = el('sync-password-export2').value;
    const status = el('sync-encrypt-status');

    if (!pw || pw.length < 4) {
      status.innerHTML = '<span style="color:var(--danger)">密码至少 4 个字符</span>';
      return;
    }
    if (pw !== pw2) {
      status.innerHTML = '<span style="color:var(--danger)">两次密码不一致</span>';
      return;
    }

    try {
      status.innerHTML = '<span style="color:var(--accent)">加密中...</span>';
      const encoded = await encryptData(data, pw);
      await navigator.clipboard.writeText(encoded);
      status.innerHTML = '<span style="color:var(--success)">✓ 已复制到剪贴板！在另一台设备上粘贴并输入相同密码即可</span>';
    } catch (e) {
      status.innerHTML = '<span style="color:var(--danger)">加密失败: ' + e.message + '</span>';
    }
  };

  // Wire up decrypt button
  el('sync-decrypt-btn').onclick = async function() {
    const encoded = el('sync-paste-area').value.trim();
    const pw = el('sync-password-import').value;
    const status = el('sync-decrypt-status');

    if (!encoded || !pw) {
      status.innerHTML = '<span style="color:var(--danger)">请粘贴加密编码并输入密码</span>';
      return;
    }

    try {
      status.innerHTML = '<span style="color:var(--accent)">解密中...</span>';
      const imported = await decryptData(encoded, pw);
      if (!imported) {
        status.innerHTML = '<span style="color:var(--danger)">解密失败：密码错误或数据损坏</span>';
        return;
      }
      // Merge into current data
      const merged = {
        ...DEFAULT_DATA,
        ...data,
        ...imported,
        attributes: { ...DEFAULT_DATA.attributes, ...(data.attributes || {}), ...(imported.attributes || {}) },
        user: { ...DEFAULT_DATA.user, ...(data.user || {}), ...(imported.user || {}) },
      };
      for (const key of Object.keys(merged.attributes)) {
        merged.attributes[key] = Math.min(100, Math.max(0, merged.attributes[key]));
      }
      saveData(merged);
      status.innerHTML = '<span style="color:var(--success)">✓ 导入成功！</span>';
      setTimeout(function() { closeModal(); renderAll(data); }, 800);
    } catch (e) {
      status.innerHTML = '<span style="color:var(--danger)">解密失败: ' + e.message + '</span>';
    }
  };
}

// --- Review Tab ---

let currentChartPeriod = 30;
let currentChartAttr = 'physique';

function renderReviewTab(data) {
  // Attribute selector for chart
  const attrSelect = el('review-attr-select');
  attrSelect.innerHTML = Object.entries(ATTR_LABELS).map(([k, v]) =>
    `<option value="${k}" ${currentChartAttr === k ? 'selected' : ''}>${ATTR_ICONS[k]} ${v}</option>`
  ).join('');
  attrSelect.onchange = function() {
    currentChartAttr = this.value;
    renderChart(data);
  };

  // Period buttons
  document.querySelectorAll('.chart-period-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.period) === currentChartPeriod);
    btn.onclick = function() {
      currentChartPeriod = parseInt(this.dataset.period);
      renderReviewTab(data);
    };
  });

  renderChart(data);
  renderCalendar(data);
  renderReviewStats(data);
}

function renderChart(data) {
  const canvas = el('chart-canvas');
  const points = getAttrHistoryForChart(data, currentChartAttr, currentChartPeriod);
  drawLineChart(canvas, points, currentChartAttr, currentChartPeriod);
}

function renderCalendar(data) {
  const container = el('calendar-heatmap');
  const days = 30;
  const today = new Date();
  const dateSet = new Set(data.attrHistory.map(h => h.date));

  let html = '';
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const hasData = dateSet.has(dateStr);
    const intensity = hasData ? 2 : 0;
    const colors = ['#222', '#806020', '#e0b040'];
    const day = d.getDate();
    html += `<div title="${dateStr}" style="width:20px;height:20px;background:${colors[intensity]};border:1px solid #333;font-size:8px;display:flex;align-items:center;justify-content:center;color:#fff">${day}</div>`;
  }
  container.innerHTML = html;
}

function renderReviewStats(data) {
  el('stat-history-days').textContent = data.attrHistory.length;
  el('stat-active-days').textContent = getCompletionRate(data, 30);
  const totalGrowth = getTotalAttributePoints(data);
  el('stat-total-growth').textContent = totalGrowth;
}

// --- Possessions Tab ---

function renderPossessionsTab(data) {
  const list = el('possession-list');
  const empty = el('possession-empty');
  const catFilter = el('pos-filter-cat');
  const statusFilter = el('pos-filter-status');

  const cats = [...new Set(data.possessions.map(p => p.category).filter(Boolean))];
  catFilter.innerHTML = '<option value="all">全部分类</option>' +
    cats.map(c => `<option value="${c}" ${catFilter.value === c ? 'selected' : ''}>${c}</option>`).join('');

  let filtered = [...data.possessions];
  if (catFilter.value && catFilter.value !== 'all') {
    filtered = filtered.filter(p => p.category === catFilter.value);
  }
  if (statusFilter.value && statusFilter.value !== 'all') {
    filtered = filtered.filter(p => p.status === statusFilter.value);
  }

  // Stats
  el('stat-asset-value').textContent = getTotalAssetValue(data).toFixed(2);
  el('stat-wanted-value').textContent = getWantedTotal(data).toFixed(2);
  el('stat-possession-count').textContent = data.possessions.filter(p => p.status !== 'sold').length;

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    list.innerHTML = filtered.map(p => {
      const days = getDaysOwned(p);
      const daily = getDailyCost(p);
      let statusBadge, statusColor, cardOpacity;
      if (p.status === 'wanted') {
        statusBadge = WANTED_PRIORITY_LABELS[p.priority] + ' 愿望中';
        statusColor = WANTED_PRIORITY_COLORS[p.priority];
        cardOpacity = '';
      } else if (p.status === 'consumed') {
        statusBadge = '🗑️ 已用完';
        statusColor = 'var(--text-dim)';
        cardOpacity = 'opacity:0.5';
      } else if (p.status === 'sold') {
        statusBadge = '🔚 已售出';
        statusColor = 'var(--text-dim)';
        cardOpacity = 'opacity:0.6';
      } else {
        statusBadge = '✅ 持有中';
        statusColor = 'var(--success)';
        cardOpacity = '';
      }
      return `
        <div class="pixel-card possession-item status-${p.status}" style="${cardOpacity}">
          <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
            ${p.image ? `<div><img src="${p.image}" style="width:72px;height:72px;object-fit:cover;border:2px solid var(--border);image-rendering:pixelated" loading="lazy"></div>` : `<div style="width:72px;height:72px;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:32px;background:#111">${p.status === 'wanted' ? '🎁' : p.status === 'consumed' ? '🗑️' : '📦'}</div>`}
            <div style="flex:1;min-width:180px">
              <div class="task-name">${p.name}</div>
              ${p.description ? `<div class="task-desc">${p.description}</div>` : ''}
              <div style="font-size:9px;color:var(--text-dim);margin-top:4px;display:flex;flex-wrap:wrap;gap:8px">
                ${p.category ? `<span>🏷️ ${p.category}</span>` : ''}
                ${p.status === 'wanted' ? `
                  ${p.targetPrice ? `<span style="color:var(--accent)">🎯 目标价: ¥${p.targetPrice.toFixed(2)}</span>` : ''}
                  ${p.link ? `<a href="${p.link}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">🔗 链接</a>` : ''}
                ` : ''}
                ${p.status === 'owned' ? `
                  <span>📅 购入: ${p.purchaseDate || '未知'}</span>
                  <span>📆 已用: ${days} 天</span>
                  <span>💵 价格: ¥${(p.purchasePrice || 0).toFixed(2)}</span>
                  <span style="color:var(--accent)">📊 日均: ¥${daily.toFixed(2)}/天</span>
                ` : ''}
                ${p.status === 'sold' ? `
                  <span>📅 购入: ${p.purchaseDate || '未知'}</span>
                  <span>🔚 售出: ¥${(p.sellPrice || 0).toFixed(2)}</span>
                ` : ''}
                ${p.status === 'consumed' ? `
                  <span>📅 购入: ${p.purchaseDate || '未知'}</span>
                  <span>🗑️ 用完: ${p.sellDate || '未知'}</span>
                  <span>📆 使用: ${days} 天</span>
                  <span style="color:var(--accent)">📊 日均: ¥${daily.toFixed(2)}/天</span>
                ` : ''}
                <span style="color:${statusColor}">${statusBadge}</span>
              </div>
            </div>
            <div class="task-actions" style="flex-shrink:0">
              ${p.status === 'wanted' ? `<button class="btn btn-success btn-sm pos-buy-btn" data-id="${p.id}" title="标记为已购买">购买</button>` : ''}
              ${p.status === 'owned' ? `<button class="btn btn-sm pos-consume-btn" data-id="${p.id}" title="用完/吃掉/消耗">用完</button>` : ''}
              ${p.status === 'owned' ? `<button class="btn btn-sm pos-sell-btn" data-id="${p.id}">出售</button>` : ''}
              <button class="btn btn-sm pos-edit-btn" data-id="${p.id}">编辑</button>
              <button class="btn btn-danger btn-sm pos-delete-btn" data-id="${p.id}">删除</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  catFilter.onchange = function() { renderPossessionsTab(data); };
  statusFilter.onchange = function() { renderPossessionsTab(data); };
}

function showPossessionModal(data, pos) {
  const isEdit = !!pos;
  const isWanted = pos && pos.status === 'wanted';
  const title = isEdit ? '编辑物品' : (isWanted ? '编辑愿望' : '新物品');
  const defaults = pos || { name: '', description: '', category: '', status: 'owned' };

  const statusOpts = `
    <option value="owned" ${defaults.status === 'owned' ? 'selected' : ''}>持有中</option>
    <option value="wanted" ${defaults.status === 'wanted' ? 'selected' : ''}>愿望中</option>
  `;

  const priorityOpts = Object.entries(WANTED_PRIORITY_LABELS).map(([k, v]) =>
    `<option value="${k}" ${(defaults.priority || 'normal') === k ? 'selected' : ''}>${v}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label>名称</label>
      <input type="text" name="name" value="${defaults.name}" required maxlength="30">
    </div>
    <div class="form-group">
      <label>描述</label>
      <textarea name="description" maxlength="200">${defaults.description}</textarea>
    </div>
    <div class="form-group">
      <label>物品图片（可选）</label>
      <input type="file" class="pos-image-file" accept="image/*" style="font-size:11px;padding:4px">
      ${defaults.image ? `<div style="margin-top:6px"><img src="${defaults.image}" style="max-width:120px;max-height:120px;border:2px solid var(--border)"></div>` : ''}
      <input type="hidden" name="image" value="${defaults.image || ''}">
    </div>
    <div class="form-group">
      <label>分类标签</label>
      <input type="text" name="category" value="${defaults.category}" maxlength="20" placeholder="如: 电子产品、家具、书籍">
    </div>
    <div class="form-group">
      <label>状态</label>
      <select name="status" id="pos-status-select">${statusOpts}</select>
    </div>
    <div id="pos-owned-fields" style="${defaults.status === 'wanted' ? 'display:none' : ''}">
      <div class="form-group">
        <label>购买日期</label>
        <input type="date" name="purchaseDate" value="${defaults.purchaseDate || todayStr()}">
      </div>
      <div class="form-group">
        <label>购买价格 (¥)</label>
        <input type="number" name="purchasePrice" value="${defaults.purchasePrice || ''}" min="0" step="0.01" placeholder="0.00">
      </div>
    </div>
    <div id="pos-wanted-fields" style="${defaults.status === 'wanted' ? '' : 'display:none'}">
      <div class="form-group">
        <label>目标价格 (¥)</label>
        <input type="number" name="targetPrice" value="${defaults.targetPrice || ''}" min="0" step="0.01" placeholder="期望价格...">
      </div>
      <div class="form-group">
        <label>渴望程度</label>
        <select name="priority">${priorityOpts}</select>
      </div>
      <div class="form-group">
        <label>购买链接（可选）</label>
        <input type="url" name="link" value="${defaults.link || ''}" placeholder="https://..." maxlength="500">
      </div>
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updatePossession(data, pos.id, formData);
    } else {
      addPossession(data, formData);
    }
    renderAll(data);
  });

  // Status toggle: show/hide owned vs wanted fields
  setTimeout(function() {
    const statusSelect = document.getElementById('pos-status-select');
    const ownedFields = document.getElementById('pos-owned-fields');
    const wantedFields = document.getElementById('pos-wanted-fields');
    if (statusSelect && ownedFields && wantedFields) {
      statusSelect.onchange = function() {
        if (this.value === 'wanted') {
          ownedFields.style.display = 'none';
          wantedFields.style.display = '';
        } else {
          ownedFields.style.display = '';
          wantedFields.style.display = 'none';
        }
      };
    }
  }, 50);
}

// --- Todos Tab ---

function renderTodosTab(data) {
  const list = el('todo-list');
  const empty = el('todo-empty');
  const priorityFilter = el('todo-filter-priority').value;
  const statusFilter = el('todo-filter-status').value;

  let filtered = [...data.todos];
  if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
  if (statusFilter === 'completed') filtered = filtered.filter(t => t.completed);
  if (statusFilter === 'uncompleted') filtered = filtered.filter(t => !t.completed);

  // Sort by priority then by completed
  const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = data.todos.length === 0 ? 'block' : 'none';
    if (data.todos.length > 0 && filtered.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px">没有符合条件的待办</p>';
    }
  } else {
    empty.style.display = 'none';
    list.innerHTML = filtered.map(t => {
      const overdue = t.dueDate && !t.completed && t.dueDate < todayStr();
      return `
        <div class="pixel-card task-item ${t.completed ? 'completed' : ''}" style="${overdue ? 'border-color:var(--danger)!important' : ''}">
          <div class="task-check todo-check" data-id="${t.id}" title="${t.completed ? '撤销' : '完成'}">
            ${t.completed ? '✓' : ''}
          </div>
          <div class="task-info">
            <div class="task-name" style="${overdue ? 'color:var(--danger)' : ''}">${t.name}</div>
            <div class="task-desc">${t.description || ''}</div>
            <div style="font-size:9px;color:var(--text-dim);margin-top:4px;display:flex;flex-wrap:wrap;gap:8px">
              <span style="color:${TODO_PRIORITY_COLORS[t.priority]}">⚡ ${TODO_PRIORITY_LABELS[t.priority]}</span>
              ${t.category ? `<span>🏷️ ${t.category}</span>` : ''}
              ${t.dueDate ? `<span style="${overdue ? 'color:var(--danger);font-weight:bold' : ''}">📅 ${t.dueDate}${overdue ? ' (已过期)' : ''}</span>` : ''}
              <span>📝 创建: ${t.createdAt}</span>
              ${t.completed ? `<span style="color:var(--success)">✓ 完成于 ${t.completedDate}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="btn btn-sm todo-edit-btn" data-id="${t.id}">编辑</button>
            <button class="btn btn-danger btn-sm todo-delete-btn" data-id="${t.id}">删除</button>
          </div>
        </div>`;
    }).join('');
  }
}

function showTodoModal(data, todo) {
  const isEdit = !!todo;
  const title = isEdit ? '编辑待办' : '新待办';
  const defaults = todo || { name: '', description: '', priority: 'normal', category: '', dueDate: '' };

  const priorityOpts = Object.entries(TODO_PRIORITY_LABELS).map(([k, v]) =>
    `<option value="${k}" ${defaults.priority === k ? 'selected' : ''}>${v}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label>名称</label>
      <input type="text" name="name" value="${defaults.name}" required maxlength="40">
    </div>
    <div class="form-group">
      <label>描述</label>
      <textarea name="description" maxlength="200">${defaults.description}</textarea>
    </div>
    <div class="form-group">
      <label>优先级</label>
      <select name="priority">${priorityOpts}</select>
    </div>
    <div class="form-group">
      <label>分类标签</label>
      <input type="text" name="category" value="${defaults.category}" maxlength="20" placeholder="如: 工作、学习、生活">
    </div>
    <div class="form-group">
      <label>截止日期（可选）</label>
      <input type="date" name="dueDate" value="${defaults.dueDate}">
    </div>
  `;

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateTodo(data, todo.id, formData);
    } else {
      addTodo(data, formData);
    }
    renderAll(data);
  });
}

// --- Accounting Tab ---

var currentAccMonth = getCurrentMonth();
var currentAccType = 'all';

function renderAccountingTab(data) {
  // Ensure currentAccMonth is set
  if (!currentAccMonth) currentAccMonth = getCurrentMonth();

  // Month selector
  var months = {};
  data.transactions.forEach(function(t) {
    var m = t.date.substring(0, 7);
    if (!months[m]) months[m] = true;
  });
  var monthList = Object.keys(months).sort().reverse();
  if (monthList.indexOf(currentAccMonth) === -1 && data.transactions.length > 0) {
    currentAccMonth = monthList[0];
  }
  if (monthList.length === 0) currentAccMonth = getCurrentMonth();

  var elMonth = el('acc-filter-month');
  elMonth.innerHTML = monthList.map(function(m) {
    return '<option value="' + m + '" ' + (m === currentAccMonth ? 'selected' : '') + '>' + m + '</option>';
  }).join('');
  if (monthList.length === 0) {
    elMonth.innerHTML = '<option value="' + currentAccMonth + '">' + currentAccMonth + '</option>';
  }

  var summary = getMonthSummary(data, currentAccMonth);

  // Summary cards
  var sumHtml =
    '<div class="summary-card pixel-card income">' +
      '<div class="sum-label">📈 本月收入</div>' +
      '<div class="sum-val">+¥' + summary.income.toFixed(2) + '</div>' +
    '</div>' +
    '<div class="summary-card pixel-card expense">' +
      '<div class="sum-label">📉 本月支出</div>' +
      '<div class="sum-val">-¥' + summary.expense.toFixed(2) + '</div>' +
    '</div>' +
    '<div class="summary-card pixel-card balance ' + (summary.balance >= 0 ? 'positive' : 'negative') + '">' +
      '<div class="sum-label">💎 本月结余</div>' +
      '<div class="sum-val">' + (summary.balance >= 0 ? '+' : '') + '¥' + summary.balance.toFixed(2) + '</div>' +
    '</div>';
  el('accounting-summary').innerHTML = sumHtml;

  // Category breakdown
  var breakdownHtml = '';
  var typeFilter = (el('acc-filter-type') && el('acc-filter-type').value) || 'all';
  if (typeFilter === 'all' || typeFilter === 'expense') {
    var expenseBreakdown = getCategoryBreakdown(data, currentAccMonth, 'expense');
    if (expenseBreakdown.length > 0) {
      var maxTotal = expenseBreakdown[0].total || 1;
      breakdownHtml += '<div class="breakdown-title">📉 支出分类</div>';
      expenseBreakdown.forEach(function(cat) {
        var pct = Math.round((cat.total / maxTotal) * 100);
        breakdownHtml +=
          '<div class="category-bar-row">' +
            '<span class="cat-icon">' + cat.icon + '</span>' +
            '<span class="cat-name">' + cat.name + '</span>' +
            '<div class="cat-bar-wrap"><div class="cat-bar-fill expense-bar" style="width:' + pct + '%"></div></div>' +
            '<span class="cat-amount">¥' + cat.total.toFixed(2) + '</span>' +
          '</div>';
      });
    }
  }
  if (typeFilter === 'all' || typeFilter === 'income') {
    var incomeBreakdown = getCategoryBreakdown(data, currentAccMonth, 'income');
    if (incomeBreakdown.length > 0) {
      var maxTotalIn = incomeBreakdown[0].total || 1;
      breakdownHtml += '<div class="breakdown-title" style="margin-top:8px">📈 收入分类</div>';
      incomeBreakdown.forEach(function(cat) {
        var pct = Math.round((cat.total / maxTotalIn) * 100);
        breakdownHtml +=
          '<div class="category-bar-row">' +
            '<span class="cat-icon">' + cat.icon + '</span>' +
            '<span class="cat-name">' + cat.name + '</span>' +
            '<div class="cat-bar-wrap"><div class="cat-bar-fill income-bar" style="width:' + pct + '%"></div></div>' +
            '<span class="cat-amount">¥' + cat.total.toFixed(2) + '</span>' +
          '</div>';
      });
    }
  }
  el('category-breakdown').innerHTML = breakdownHtml;

  // Transaction list
  var transFiltered = data.transactions.filter(function(t) {
    var m = t.date.substring(0, 7);
    if (m !== currentAccMonth) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  var listEl = el('transaction-list');
  var emptyEl = el('transaction-empty');

  if (transFiltered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    if (data.transactions.length > 0) {
      emptyEl.querySelector('p').textContent = '当前筛选条件下没有账单';
    } else {
      emptyEl.querySelector('p').textContent = '还没有账单记录，开始记账吧！';
    }
  } else {
    emptyEl.style.display = 'none';
    var lastDate = '';
    listEl.innerHTML = transFiltered.map(function(t) {
      var cat = getCategoryInfo(t.type, t.category);
      var dateDivider = '';
      if (t.date !== lastDate) {
        lastDate = t.date;
        var weekDay = ['日','一','二','三','四','五','六'][new Date(t.date).getDay()];
        dateDivider = '<div class="tx-date-divider">📅 ' + t.date + ' 周' + weekDay + '</div>';
      }
      return dateDivider +
        '<div class="pixel-card transaction-item type-' + t.type + '">' +
          '<div class="tx-icon">' + cat.icon + '</div>' +
          '<div class="tx-info">' +
            '<div class="tx-name">' + cat.name + '</div>' +
            (t.description ? '<div class="tx-desc">' + t.description + '</div>' : '') +
          '</div>' +
          '<div class="tx-amount ' + t.type + '">' + (t.type === 'income' ? '+' : '-') + '¥' + t.amount.toFixed(2) + '</div>' +
          '<div class="task-actions" style="flex-shrink:0">' +
            '<button class="btn btn-sm tx-edit-btn" data-id="' + t.id + '">编辑</button>' +
            '<button class="btn btn-danger btn-sm tx-delete-btn" data-id="' + t.id + '">删除</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  // Wire filters
  var monthSelect = el('acc-filter-month');
  if (monthSelect) {
    monthSelect.onchange = function() {
      currentAccMonth = this.value;
      renderAccountingTab(data);
    };
  }
  var typeSelect = el('acc-filter-type');
  if (typeSelect) {
    typeSelect.onchange = function() { renderAccountingTab(data); };
  }
}

function showTransactionModal(data, tx) {
  var isEdit = !!tx;
  var title = isEdit ? '编辑账单' : '记一笔';
  var defaults = tx || { type: 'expense', amount: '', category: 'food', description: '', date: todayStr() };

  var incomeCats = TRANSACTION_CATEGORIES.income.map(function(c) {
    return '<option value="' + c.id + '" ' + (defaults.category === c.id ? 'selected' : '') + '>' + c.icon + ' ' + c.name + '</option>';
  }).join('');

  var expenseCats = TRANSACTION_CATEGORIES.expense.map(function(c) {
    return '<option value="' + c.id + '" ' + (defaults.category === c.id ? 'selected' : '') + '>' + c.icon + ' ' + c.name + '</option>';
  }).join('');

  var body =
    '<div class="type-toggle">' +
      '<button type="button" class="type-toggle-btn tx-type-btn ' + (defaults.type === 'income' ? 'active-income' : '') + '" data-type="income">📈 收入</button>' +
      '<button type="button" class="type-toggle-btn tx-type-btn ' + (defaults.type === 'expense' ? 'active-expense' : '') + '" data-type="expense">📉 支出</button>' +
    '</div>' +
    '<input type="hidden" name="type" value="' + defaults.type + '">' +
    '<div class="form-group">' +
      '<label>金额 (¥)</label>' +
      '<input type="number" name="amount" value="' + defaults.amount + '" min="0" step="0.01" placeholder="0.00" required>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>分类</label>' +
      '<select name="category" id="tx-category-select">' +
        (defaults.type === 'income' ? incomeCats : expenseCats) +
      '</select>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>描述（可选）</label>' +
      '<input type="text" name="description" value="' + defaults.description + '" maxlength="40" placeholder="备注信息...">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>日期</label>' +
      '<input type="date" name="date" value="' + defaults.date + '">' +
    '</div>';

  showModal(title, body, function(formData) {
    if (isEdit) {
      updateTransaction(data, tx.id, formData);
    } else {
      addTransaction(data, formData);
    }
    renderAll(data);
  });

  // Wire type toggle buttons
  setTimeout(function() {
    var typeBtns = document.querySelectorAll('.tx-type-btn');
    var typeInput = document.querySelector('input[name="type"]');
    var catSelect = document.getElementById('tx-category-select');
    typeBtns.forEach(function(btn) {
      btn.onclick = function() {
        var newType = this.dataset.type;
        typeBtns.forEach(function(b) {
          b.classList.remove('active-income', 'active-expense');
          if (b.dataset.type === newType) b.classList.add(newType === 'income' ? 'active-income' : 'active-expense');
        });
        typeInput.value = newType;
        // Update category options
        var cats = TRANSACTION_CATEGORIES[newType];
        catSelect.innerHTML = cats.map(function(c) {
          return '<option value="' + c.id + '">' + c.icon + ' ' + c.name + '</option>';
        }).join('');
      };
    });
  }, 50);
}

// --- Tab Switching ---

let currentTab = 'character';

function switchTab(data, tab) {
  currentTab = tab;
  qsa('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  qsa('.tab-content').forEach(c => c.classList.toggle('active', c.id === 'tab-' + tab));
  // Sync bottom nav
  qsa('.bottom-nav-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  // Update FAB label
  var labels = { achievements: '🏆', tasks: '📋', dailies: '📅', skills: '📚', possessions: '🎒', todos: '📝', diary: '📖', bookmarks: '🔗', accounting: '💳' };
  el('fab-btn').textContent = labels[tab] || '+';
  renderTab(data, tab);
}

function renderTab(data, tab) {
  switch (tab) {
    case 'character': renderCharacterTab(data); break;
    case 'attributes': renderAttributesTab(data); break;
    case 'achievements': renderAchievementsTab(data); break;
    case 'tasks': renderTasksTab(data); break;
    case 'dailies': renderDailiesTab(data); break;
    case 'skills': renderSkillsTab(data); break;
    case 'possessions': renderPossessionsTab(data); break;
    case 'todos': renderTodosTab(data); break;
    case 'diary': renderDiaryTab(data); break;
    case 'review': renderReviewTab(data); break;
    case 'bookmarks': renderBookmarksTab(data); break;
    case 'accounting': renderAccountingTab(data); break;
  }
}

function renderAll(data) {
  renderTab(data, currentTab);
}

// --- Event Delegation ---

function setupEventDelegation(data) {
  const content = el('content');

  // Achievement edit button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.ach-edit-btn');
    if (btn) {
      const ach = data.achievements.find(a => a.id === btn.dataset.id);
      if (ach) showAchievementModal(data, ach);
      return;
    }
  });

  // Achievement delete button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.ach-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该成就？', function() {
        playSfx('delete');
        deleteAchievement(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Task check toggle
  content.addEventListener('click', function(e) {
    const check = e.target.closest('.task-check');
    if (check) {
      const t = data.tasks.find(x => x.id === check.dataset.id);
      if (!t) return;
      if (t.completed) {
        uncompleteTask(data, t.id);
        playSfx('click');
      } else {
        const result = completeTask(data, t.id);
        playSfx(result && result.achievementCompleted ? 'achievement' : 'complete');
        if (result && result.achievementCompleted) {
          spawnSparkles();
          setTimeout(function() {
            showToast('🏅 关联成就 "' + result.achievementCompleted.name + '" 已自动完成！', 'achievement', 4000);
          }, 150);
        }
      }
      renderAll(data);
      return;
    }
  });

  // Task edit button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.task-edit-btn');
    if (btn) {
      const t = data.tasks.find(x => x.id === btn.dataset.id);
      if (t) showTaskModal(data, t);
      return;
    }
  });

  // Task delete button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.task-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该任务？', function() {
        playSfx('delete');
        deleteTask(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Daily check toggle
  content.addEventListener('click', function(e) {
    const check = e.target.closest('.daily-check');
    if (check) {
      playSfx('click');
      toggleDaily(data, check.dataset.id);
      renderAll(data);
      return;
    }
  });

  // Daily edit button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.daily-edit-btn');
    if (btn) {
      const d = data.dailies.find(x => x.id === btn.dataset.id);
      if (d) showDailyModal(data, d);
      return;
    }
  });

  // Daily delete button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.daily-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该日常？', function() {
        playSfx('delete');
        deleteDaily(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Skill check toggle
  content.addEventListener('click', function(e) {
    const check = e.target.closest('[data-skill-id]');
    if (check && check.classList.contains('task-check')) {
      toggleSkill(data, check.dataset.skillId);
      renderAll(data);
      return;
    }
  });

  // Skill edit button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.skill-edit-btn');
    if (btn) {
      const s = data.skills.find(x => x.id === btn.dataset.id);
      if (s) showSkillModal(data, s);
      return;
    }
  });

  // Skill delete button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.skill-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该技能？', function() {
        playSfx('delete');
        deleteSkill(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Possession consume (owned → consumed)
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.pos-consume-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定已用完/吃掉该物品？', function() {
        consumePossession(data, btn.dataset.id);
        showToast('物品已标记为已用完', 'info');
        renderAll(data);
      });
      return;
    }
  });

  // Possession buy (wanted → owned)
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.pos-buy-btn');
    if (btn) {
      playSfx('click');
      const p = data.possessions.find(x => x.id === btn.dataset.id);
      if (p) {
        const price = prompt('输入实际购买价格 (¥)：', p.targetPrice || '0');
        if (price !== null) {
          buyPossession(data, btn.dataset.id, parseFloat(price) || 0);
          playSfx('complete');
          showToast('🎉 已购入！', 'success');
          renderAll(data);
        }
      }
      return;
    }
  });

  // Possession sell (owned → sold)
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.pos-sell-btn');
    if (btn) {
      playSfx('click');
      const price = prompt('输入出售价格 (¥)：', '0');
      if (price !== null) {
        sellPossession(data, btn.dataset.id, parseFloat(price) || 0);
        showToast('物品已出售', 'info');
        renderAll(data);
      }
      return;
    }
  });

  // Possession edit
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.pos-edit-btn');
    if (btn) {
      const p = data.possessions.find(x => x.id === btn.dataset.id);
      if (p) showPossessionModal(data, p);
      return;
    }
  });

  // Possession delete
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.pos-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该物品？', function() {
        playSfx('delete');
        deletePossession(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Todo check toggle
  content.addEventListener('click', function(e) {
    const check = e.target.closest('.todo-check');
    if (check) {
      playSfx('click');
      toggleTodo(data, check.dataset.id);
      renderAll(data);
      return;
    }
  });

  // Todo edit
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.todo-edit-btn');
    if (btn) {
      const t = data.todos.find(x => x.id === btn.dataset.id);
      if (t) showTodoModal(data, t);
      return;
    }
  });

  // Todo delete
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.todo-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该待办？', function() {
        playSfx('delete');
        deleteTodo(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Diary edit
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.diary-edit-btn');
    if (btn) {
      const d = data.diaries.find(x => x.id === btn.dataset.id);
      if (d) showDiaryModal(data, d);
      return;
    }
  });

  // Diary delete
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.diary-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除这篇日记？', function() {
        playSfx('delete');
        deleteDiary(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Bookmark edit
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.bm-edit-btn');
    if (btn) {
      const b = data.bookmarks.find(x => x.id === btn.dataset.id);
      if (b) showBookmarkModal(data, b);
      return;
    }
  });

  // Bookmark delete
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.bm-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该收藏？', function() {
        playSfx('delete');
        deleteBookmark(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Transaction edit
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.tx-edit-btn');
    if (btn) {
      var t = data.transactions.find(function(x) { return x.id === btn.dataset.id; });
      if (t) showTransactionModal(data, t);
      return;
    }
  });

  // Transaction delete
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.tx-delete-btn');
    if (btn) {
      playSfx('click');
      showConfirm('确定删除该账单？', function() {
        playSfx('delete');
        deleteTransaction(data, btn.dataset.id);
        renderAll(data);
      });
      return;
    }
  });

  // Tab buttons
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      switchTab(data, this.dataset.tab);
    });
  });

  // Add buttons
  el('btn-add-ach').onclick = function() { showAchievementModal(data, null); };
  el('btn-add-task').onclick = function() { showTaskModal(data, null); };
  el('btn-add-daily').onclick = function() { showDailyModal(data, null); };
  el('btn-add-skill').onclick = function() { showSkillModal(data, null); };
  el('btn-add-possession').onclick = function() { showPossessionModal(data, null); };
  el('btn-add-todo').onclick = function() { showTodoModal(data, null); };
  el('btn-add-diary').onclick = function() { showDiaryModal(data, null); };
  el('btn-add-bookmark').onclick = function() { showBookmarkModal(data, null); };
  el('btn-add-transaction').onclick = function() { showTransactionModal(data, null); };

  // Filter change handlers
  el('ach-filter-diff').onchange = function() { renderAchievementsTab(data); };
  el('ach-filter-status').onchange = function() { renderAchievementsTab(data); };
  el('todo-filter-priority').onchange = function() { renderTodosTab(data); };
  el('todo-filter-status').onchange = function() { renderTodosTab(data); };
  el('diary-filter-mood').onchange = function() { renderDiaryTab(data); };
  el('diary-search').oninput = function() { renderDiaryTab(data); };

  // Sync
  el('btn-sync').onclick = function() { showSyncModal(data); };

  // Export
  el('btn-export').onclick = function() { exportData(data); };

  // Import
  el('btn-import').onclick = function() { el('import-file').click(); };
  el('import-file').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      showConfirm('导入将覆盖当前数据，确定继续？', function() {
        const result = importData(data, ev.target.result);
        if (result) {
          Object.assign(data, result);
          showToast('导入成功！正在刷新...', 'success');
          setTimeout(function() { window.location.reload(); }, 600);
        } else {
          showToast('导入失败：无效的数据格式', 'error');
        }
      });
    };
    reader.readAsText(file);
    this.value = '';
  };

  // Sound toggle
  el('btn-sound').onclick = function() {
    const on = toggleSound();
    this.textContent = on ? '🔊' : '🔇';
    this.classList.toggle('on', on);
  };
  el('btn-sound').classList.toggle('on', soundEnabled);
  el('btn-sound').textContent = soundEnabled ? '🔊' : '🔇';

  // Bottom Nav click handler
  const bnBtns = qsa('.bottom-nav-btn');
  bnBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      playSfx('click');
      switchTab(data, this.dataset.tab);
      // Scroll active button into view
      this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });

  // FAB button - quick add based on current tab
  el('fab-btn').onclick = function() {
    playSfx('click');
    switch (currentTab) {
      case 'achievements': showAchievementModal(data, null); break;
      case 'tasks': showTaskModal(data, null); break;
      case 'dailies': showDailyModal(data, null); break;
      case 'skills': showSkillModal(data, null); break;
      case 'possessions': showPossessionModal(data, null); break;
      case 'todos': showTodoModal(data, null); break;
      case 'diary': showDiaryModal(data, null); break;
      case 'bookmarks': showBookmarkModal(data, null); break;
      case 'accounting': showTransactionModal(data, null); break;
      default: showAchievementModal(data, null); break;
    }
  };

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Escape') {
      closeModal();
      const co = document.querySelector('.confirm-overlay');
      if (co) co.parentNode.removeChild(co);
    }
    // Number keys for tabs
    var tabKeys = ['1','2','3','4','5','6','7','8','9','0','-','='];
    var tabNames = ['character','attributes','achievements','tasks','dailies','skills','possessions','todos','diary','review','bookmarks','accounting'];
    const idx = tabKeys.indexOf(e.key);
    if (idx >= 0 && idx < tabNames.length) {
      switchTab(data, tabNames[idx]);
      playSfx('click');
    }
  });

  // Achievement complete button - add sparkle + sound
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.ach-complete-btn');
    if (btn) {
      playSfx('achievement');
      completeAchievement(data, btn.dataset.id);
      spawnSparkles();
      showToast('🏆 成就解锁！', 'achievement', 4000);
      renderAll(data);
      return;
    }
  });

  // Achievement undo button
  content.addEventListener('click', function(e) {
    const btn = e.target.closest('.ach-undo-btn');
    if (btn) {
      uncompleteAchievement(data, btn.dataset.id);
      renderAll(data);
      return;
    }
  });
}

// --- Init ---

function initUI(data) {
  currentData = data;
  setupEventDelegation(data);
  switchTab(data, 'character');
}
