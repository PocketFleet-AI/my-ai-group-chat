// 量图标实际内容边界（alpha 通道），并给出「裁到内容 + 留 2px 边距」后的建议。
// 纯 Node 解 PNG：zlib inflate + 反滤波，读 RGBA。
const fs = require("fs");
const zlib = require("zlib");

function decodePNG(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  let plte = null, trns = null;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "PLTE") plte = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error("only 8-bit supported, got " + bitDepth);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.slice(p, p + stride); p += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      switch (filter) {
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          break;
        }
      }
      cur[x] = v & 0xff;
    }
  }
  // 返回 alpha 覆盖判定
  const alphaAt = (x, y) => {
    const i = y * stride + x * channels;
    if (colorType === 6) return out[i + 3];
    if (colorType === 4) return out[i + 1];
    if (colorType === 3) return trns && out[i] < trns.length ? trns[out[i]] : 255;
    return 255; // 无 alpha 通道：整幅不透明
  };
  return { w, h, colorType, alphaAt };
}

function contentBox(img, threshold = 8) {
  let minX = img.w, minY = img.h, maxX = -1, maxY = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.alphaAt(x, y) > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY, cw: maxX - minX + 1, ch: maxY - minY + 1 };
}

const files = process.argv.slice(2);
for (const f of files) {
  const img = decodePNG(f);
  const box = contentBox(img);
  const pct = box ? ((box.cw / img.w) * 100).toFixed(1) : "n/a";
  const padL = box ? ((box.minX / img.w) * 100).toFixed(1) : "n/a";
  console.log(
    f.split(/[\\/]/).pop().padEnd(24),
    `${img.w}x${img.h} ct=${img.colorType}`,
    `内容 ${box.cw}x${box.ch} (${pct}%宽)`,
    `左留白 ${padL}%`
  );
}