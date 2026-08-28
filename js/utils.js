const Utils = {
  $(sel, root) {
    return (root || document).querySelector(sel);
  },

  $$(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  },

  el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        const val = attrs[key];
        if (val == null || val === false) return;
        if (key === "class") node.className = val;
        else if (key === "text") node.textContent = val;
        else if (key === "html") node.innerHTML = val;
        else if (key === "style" && typeof val === "object") Object.assign(node.style, val);
        else if (key.startsWith("on") && typeof val === "function") node.addEventListener(key.slice(2).toLowerCase(), val);
        else if (val === true) node.setAttribute(key, "");
        else node.setAttribute(key, String(val));
      });
    }
    (children || []).forEach((child) => {
      if (child == null) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  },

  uid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  },

  clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  },

  pad(n) {
    return String(n).padStart(2, "0");
  },

  monthName(index, year) {
    return new Date(year || 2026, index, 1).toLocaleString("en-US", { month: "long" });
  },

  isoDate(date) {
    return (
      date.getFullYear() +
      "-" +
      Utils.pad(date.getMonth() + 1) +
      "-" +
      Utils.pad(date.getDate())
    );
  },

  parseIso(iso) {
    const parts = String(iso).split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  },

  daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },

  eachDate(startIso, endIsoInclusive, fn) {
    const start = Utils.parseIso(startIso);
    const end = Utils.parseIso(endIsoInclusive || startIso);
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor <= last) {
      fn(Utils.isoDate(cursor), cursor);
      cursor.setDate(cursor.getDate() + 1);
    }
  },

  hexToRgba(hex, alpha) {
    let h = String(hex || "#000000").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  },

  readDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  readText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = src;
    });
  },

  async normalizeImageFile(file, maxEdge) {
    const url = await Utils.readDataURL(file);
    const img = await Utils.loadImage(url);
    const max = maxEdge || 4000;
    if (img.width <= max && img.height <= max) {
      return { src: url, width: img.width, height: img.height };
    }
    const scale = max / Math.max(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      src: canvas.toDataURL("image/jpeg", 0.92),
      width: canvas.width,
      height: canvas.height,
    };
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  downloadText(text, filename, type) {
    Utils.downloadBlob(new Blob([text], { type: type || "application/json" }), filename);
  },

  debounce(fn, ms) {
    let t = 0;
    return function debounced() {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  },

  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  computeCoverRect(frameW, frameH, natW, natH, scale, xPct, yPct) {
    if (!natW || !natH || !frameW || !frameH) {
      return { x: 0, y: 0, w: frameW, h: frameH };
    }
    const cover = Math.max(frameW / natW, frameH / natH);
    const s = cover * (scale || 1);
    const w = natW * s;
    const h = natH * s;
    const x = (frameW - w) / 2 + ((xPct || 0) / 100) * frameW;
    const y = (frameH - h) / 2 + ((yPct || 0) / 100) * frameH;
    return { x: x, y: y, w: w, h: h };
  },

  wrapText(ctx, text, maxWidth) {
    const raw = String(text || "").replace(/\r/g, "");
    const paragraphs = raw.split("\n");
    const lines = [];
    paragraphs.forEach((para, pIndex) => {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
        return;
      }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const next = line + " " + words[i];
        if (ctx.measureText(next).width <= maxWidth) line = next;
        else {
          lines.push(line);
          line = words[i];
        }
      }
      lines.push(line);
      if (pIndex < paragraphs.length - 1 && para === "") lines.push("");
    });
    return lines;
  },

  toast(message, kind) {
    let host = document.getElementById("toasts");
    if (!host) {
      host = Utils.el("div", { id: "toasts", class: "toasts" });
      document.body.appendChild(host);
    }
    const node = Utils.el("div", { class: "toast" + (kind ? " toast-" + kind : ""), text: message });
    host.appendChild(node);
    setTimeout(function () {
      node.classList.add("is-out");
      setTimeout(function () {
        node.remove();
      }, 280);
    }, 2800);
  },
};
