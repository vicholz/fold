class OverlayLayer {
  constructor(root, options) {
    this.root = root;
    this.imageEl = root.querySelector(".overlay-image");
    this.colorEl = root.querySelector(".overlay-color");
    this.textsEl = root.querySelector(".overlay-texts");
    this.options = options;
    this.drag = null;
    this.bind();
  }

  model() {
    return this.options.get();
  }

  bind() {
    this.textsEl.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.textsEl.addEventListener("dblclick", (event) => {
      const box = event.target.closest(".text-box");
      if (!box || !this.options.interactive) return;
      this.beginEdit(box.dataset.id);
    });
  }

  onPointerDown(event) {
    if (!this.options.interactive) return;
    const handle = event.target.closest(".handle");
    const box = event.target.closest(".text-box");
    if (!box) return;
    event.stopPropagation();
    const id = box.dataset.id;
    this.options.onSelect(id);
    if (box.classList.contains("is-editing")) return;
    event.preventDefault();
    const model = this.model().texts.find((t) => t.id === id);
    if (!model) return;
    const panel = this.root.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    this.drag = {
      id: id,
      kind: handle ? "resize" : "move",
      x: event.clientX,
      y: event.clientY,
      ox: model.x,
      oy: model.y,
      ow: model.w,
      panelW: panel.width,
      panelH: panel.height,
      heightPct: panel.height ? (boxRect.height / panel.height) * 100 : 8,
    };
    const move = (ev) => {
      if (!this.drag) return;
      const dx = ((ev.clientX - this.drag.x) / this.drag.panelW) * 100;
      const dy = ((ev.clientY - this.drag.y) / this.drag.panelH) * 100;
      if (this.drag.kind === "resize") {
        this.options.patchText(this.drag.id, {
          w: Utils.clamp(this.drag.ow + dx, 12, 100 - this.drag.ox),
        });
      } else {
        const maxX = Math.max(0, 100 - this.drag.ow);
        const maxY = Math.max(0, 100 - this.drag.heightPct);
        this.options.patchText(this.drag.id, {
          x: Utils.clamp(this.drag.ox + dx, 0, maxX),
          y: Utils.clamp(this.drag.oy + dy, 0, maxY),
        });
      }
    };
    const up = () => {
      this.drag = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  beginEdit(id) {
    const node = this.textsEl.querySelector('[data-id="' + id + '"]');
    if (!node) return;
    const content = node.querySelector(".text-box-content") || node;
    node.classList.add("is-editing");
    content.setAttribute("contenteditable", "true");
    content.focus();
    const finish = () => {
      node.classList.remove("is-editing");
      content.removeAttribute("contenteditable");
      this.options.patchText(id, { content: content.innerText.replace(/\u00a0/g, " ") });
      content.removeEventListener("blur", finish);
    };
    content.addEventListener("blur", finish);
  }

  apply(selectedId) {
    const model = this.model();
    const show = model.enabled;
    this.colorEl.style.background = show ? Utils.hexToRgba(model.color, model.colorOpacity) : "transparent";
    if (show && model.image) {
      this.imageEl.style.backgroundImage = "url(" + model.image + ")";
      this.imageEl.style.opacity = String(model.imageOpacity);
    } else {
      this.imageEl.style.backgroundImage = "none";
      this.imageEl.style.opacity = "0";
    }
    this.renderTexts(model.texts || [], selectedId);
  }

  renderTexts(texts, selectedId) {
    const existing = new Map();
    Utils.$$(".text-box", this.textsEl).forEach((node) => existing.set(node.dataset.id, node));
    const keep = new Set();
    texts.forEach((box) => {
      keep.add(box.id);
      let node = existing.get(box.id);
      if (!node) {
        node = OverlayLayer.buildTextBox(box, this.options.interactive);
        this.textsEl.appendChild(node);
      } else {
        OverlayLayer.styleTextBox(node, box);
      }
      node.classList.toggle("is-selected", box.id === selectedId && this.options.interactive);
    });
    existing.forEach((node, id) => {
      if (!keep.has(id)) node.remove();
    });
  }

  static buildTextBox(box, interactive) {
    const node = Utils.el("div", { class: "text-box", "data-id": box.id });
    node.appendChild(Utils.el("div", { class: "text-box-bg-image" }));
    node.appendChild(Utils.el("div", { class: "text-box-bg-color" }));
    node.appendChild(Utils.el("div", { class: "text-box-content" }));
    if (interactive) node.appendChild(Utils.el("span", { class: "handle handle-e" }));
    OverlayLayer.styleTextBox(node, box);
    return node;
  }

  static styleTextBox(node, box) {
    const content = node.querySelector(".text-box-content");
    const bgImage = node.querySelector(".text-box-bg-image");
    const bgColor = node.querySelector(".text-box-bg-color");
    if (content && !node.classList.contains("is-editing")) content.textContent = box.content || "";
    node.style.left = box.x + "%";
    node.style.top = box.y + "%";
    node.style.width = box.w + "%";
    if (content) {
      content.style.fontFamily = box.fontFamily;
      content.style.fontSize = box.fontSize + "pt";
      content.style.color = box.color;
      content.style.fontWeight = box.bold ? "700" : "400";
      content.style.fontStyle = box.italic ? "italic" : "normal";
      content.style.textDecoration = box.underline ? "underline" : "none";
      content.style.textAlign = box.align;
      content.style.opacity = String(box.opacity);
      content.style.letterSpacing = (box.letterSpacing || 0) + "px";
    }
    if (bgColor) {
      const opacity = box.bgColorOpacity || 0;
      bgColor.style.background = opacity ? Utils.hexToRgba(box.bgColor || "#1a1410", opacity) : "transparent";
    }
    if (bgImage) {
      if (box.bgImage) {
        bgImage.style.backgroundImage = "url(" + box.bgImage + ")";
        bgImage.style.opacity = String(box.bgImageOpacity != null ? box.bgImageOpacity : 1);
      } else {
        bgImage.style.backgroundImage = "none";
        bgImage.style.opacity = "0";
      }
    }
  }
}
