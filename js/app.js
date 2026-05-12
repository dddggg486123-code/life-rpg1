// app.js — 入口初始化、模块协调

(function() {
  'use strict';

  const data = loadData();

  // Ensure overflow property exists for older data
  if (data.overflow === undefined) data.overflow = 0;

  initUI(data);

  // Redraw character when resize (debounced)
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      const canvas = document.getElementById('char-canvas');
      if (canvas && data.attributes) {
        setCharacterPreset(data.user.characterType);
        drawCharacter(canvas, data.attributes);
      }
    }, 200);
  });
})();
