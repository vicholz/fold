class CropDialog {
  constructor(dialog) {
    this.dialog = dialog;
    this.stage = dialog.querySelector(".crop-stage");
    this.img = dialog.querySelector(".crop-stage img");
    this.rectEl = dialog.querySelector(".crop-rect");
    this.callback = null;
    this.natural = { w: 0, h: 0 };
    this.display = { x: 0, y: 0, w: 0, h: 0 };
    this.crop = { x: 0, y: 0, w: 0, h: 0 };
    this.drag = null;
    this.bind();
  }

  bind() {
    this.rectEl.addEventListener("pointerdown", (event) => this.onDown(event));
    this.dialog.querySelector("[data-crop-cancel]").addEventListener("click", () => this.dialog.close());
    this.dialog.querySelector("[data-crop-apply]").addEventListener("click", () => this.apply());
  }

  open(src, callback) {
    this.callback = callback;
    this.img.src = src;
    this.img.onload = () => {
      this.natural = { w: this.img.naturalWidth, h: this.img.naturalHeight };
      this.layoutImage();
      this.crop = { x: 0, y: 0, w: this.natural.w, h: this.natural.h };
      this.drawRect();
    };
    if (typeof this.dialog.showModal === "function") this.dialog.showModal();
    else this.dialog.setAttribute("open", "");
  }

  layoutImage() {
    const sw = this.stage.clientWidth;
    const sh = this.stage.clientHeight;
    const scale = Math.min(sw / this.natural.w, sh / this.natural.h);
    this.display.w = this.natural.w * scale;
    this.display.h = this.natural.h * scale;
    this.display.x = (sw - this.display.w) / 2;
    this.display.y = (sh - this.display.h) / 2;
    this.img.style.width = this.display.w + "px";
    this.img.style.height = this.display.h + "px";
    this.img.style.left = this.display.x + "px";
    this.img.style.top = this.display.y + "px";
  }

  toScreen(crop) {
    const sx = this.display.w / this.natural.w;
    const sy = this.display.h / this.natural.h;
    return {
      x: this.display.x + crop.x * sx,
      y: this.display.y + crop.y * sy,
      w: crop.w * sx,
      h: crop.h * sy,
    };
  }

  drawRect() {
    const s = this.toScreen(this.crop);
    this.rectEl.style.left = s.x + "px";
    this.rectEl.style.top = s.y + "px";
    this.rectEl.style.width = s.w + "px";
    this.rectEl.style.height = s.h + "px";
  }

  onDown(event) {
    const handle = event.target.dataset.handle;
    event.preventDefault();
    const start = {
      x: event.clientX,
      y: event.clientY,
      crop: Object.assign({}, this.crop),
      handle: handle || "move",
    };
    const move = (ev) => {
      const sx = this.natural.w / this.display.w;
      const sy = this.natural.h / this.display.h;
      const dx = (ev.clientX - start.x) * sx;
      const dy = (ev.clientY - start.y) * sy;
      let { x, y, w, h } = start.crop;
      const handleName = start.handle;
      if (handleName === "move") {
        x = Utils.clamp(x + dx, 0, this.natural.w - w);
        y = Utils.clamp(y + dy, 0, this.natural.h - h);
      } else {
        if (handleName.indexOf("w") !== -1) {
          const nx = Utils.clamp(x + dx, 0, x + w - 20);
          w += x - nx;
          x = nx;
        }
        if (handleName.indexOf("e") !== -1) w = Utils.clamp(w + dx, 20, this.natural.w - x);
        if (handleName.indexOf("n") !== -1) {
          const ny = Utils.clamp(y + dy, 0, y + h - 20);
          h += y - ny;
          y = ny;
        }
        if (handleName.indexOf("s") !== -1) h = Utils.clamp(h + dy, 20, this.natural.h - y);
      }
      this.crop = { x: x, y: y, w: w, h: h };
      this.drawRect();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async apply() {
    const image = await Utils.loadImage(this.img.src);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(this.crop.w));
    canvas.height = Math.max(1, Math.round(this.crop.h));
    canvas
      .getContext("2d")
      .drawImage(image, this.crop.x, this.crop.y, this.crop.w, this.crop.h, 0, 0, canvas.width, canvas.height);
    const src = canvas.toDataURL("image/jpeg", 0.93);
    if (this.callback) this.callback(src);
    this.dialog.close();
  }
}
