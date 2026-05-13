// Generate PNG icons for PWA without external dependencies
// Renders a pixel-art sword icon to 192x192 and 512x512 PNG files
var zlib = require('zlib');
var fs = require('fs');

function crc32(buf) {
  var table = [];
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  var len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  var typeB = Buffer.from(type, 'ascii');
  var crcData = Buffer.concat([typeB, data]);
  var crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeB, data, crcVal]);
}

function renderIcon(size) {
  var pixels = Buffer.alloc(size * size * 4, 0);
  var cx = size / 2, cy = size * 0.4;
  var s = size / 512; // scale

  function rect(x, y, w, h, r, g, b, a) {
    x = Math.round(x * s); y = Math.round(y * s);
    w = Math.round(w * s); h = Math.round(h * s);
    for (var dy = Math.max(0, y); dy < Math.min(size, y + h); dy++) {
      for (var dx = Math.max(0, x); dx < Math.min(size, x + w); dx++) {
        var i = (dy * size + dx) * 4;
        pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
      }
    }
  }

  function circle(cx2, cy2, r2, col) {
    cx2 = Math.round(cx2 * s); cy2 = Math.round(cy2 * s); r2 = Math.round(r2 * s);
    for (var dy = -r2; dy <= r2; dy++) {
      for (var dx = -r2; dx <= r2; dx++) {
        if (dx*dx + dy*dy <= r2*r2) {
          var px = cx2 + dx, py = cy2 + dy;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            var i = (py * size + px) * 4;
            pixels[i] = col[0]; pixels[i+1] = col[1]; pixels[i+2] = col[2]; pixels[i+3] = col[3] || 255;
          }
        }
      }
    }
  }

  // Background rounded rect (#1a1a2e)
  rect(0, 0, 512, 512, 26, 26, 46, 255);
  // Border
  rect(4, 4, 504, 6, 74, 106, 138, 255);  // top
  rect(4, 502, 504, 6, 74, 106, 138, 255); // bottom
  rect(4, 4, 6, 504, 74, 106, 138, 255);   // left
  rect(502, 4, 6, 504, 74, 106, 138, 255); // right

  // Sword blade (light blue-gray)
  rect(248, 25, 16, 250, 192, 208, 224, 255);
  rect(244, 80, 24, 12, 224, 232, 240, 255);

  // Blade tip
  var tip = Math.round(256 * s), tipY = Math.round(25 * s);
  for (var dx2 = -Math.round(6*s); dx2 <= Math.round(6*s); dx2++) {
    for (var dy2 = 0; dy2 <= Math.round(12*s); dy2++) {
      if (Math.abs(dx2) < dy2 * 0.5) {
        var ppx = tip + dx2, ppy = tipY + dy2;
        if (ppx >= 0 && ppx < size && ppy >= 0 && ppy < size) {
          var ii = (ppy * size + ppx) * 4;
          pixels[ii] = 224; pixels[ii+1] = 232; pixels[ii+2] = 240; pixels[ii+3] = 255;
        }
      }
    }
  }

  // Guard (gold)
  rect(216, 275, 80, 16, 224, 176, 64, 255);
  // Guard center
  rect(252, 265, 8, 26, 240, 208, 96, 255);

  // Grip (brown)
  rect(246, 291, 20, 80, 138, 96, 64, 255);
  // Grip bands
  rect(242, 291, 28, 8, 224, 176, 64, 255);
  rect(242, 363, 28, 8, 224, 176, 64, 255);

  // Pommel (gold circle)
  circle(256, 385, 12, [240, 208, 96, 255]);

  // Stars
  circle(100, 100, 3, [240, 208, 96, 160]);
  circle(400, 80, 2, [240, 208, 96, 100]);
  circle(420, 380, 3, [240, 208, 96, 120]);
  circle(80, 400, 2, [240, 208, 96, 100]);

  // Level bar background
  rect(80, 430, 352, 20, 10, 10, 30, 255);
  // Level bar fill
  rect(84, 434, 220, 12, 96, 192, 224, 255);

  return pixels;
}

function makePng(size) {
  var pixels = renderIcon(size);

  // Create raw image data with filter byte per row
  var rawRows = [];
  for (var y = 0; y < size; y++) {
    rawRows.push(0); // filter: none
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4;
      rawRows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }
  var raw = Buffer.from(rawRows);
  var compressed = zlib.deflateSync(raw);

  var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  var ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 6;   // color type: RGBA
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace
  var ihdr = chunk('IHDR', ihdrData);
  var idat = chunk('IDAT', compressed);
  var iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

var sizes = [192, 512];
sizes.forEach(function(s) {
  var png = makePng(s);
  fs.writeFileSync('icon-' + s + '.png', png);
  console.log('Generated icon-' + s + '.png (' + png.length + ' bytes)');
});
