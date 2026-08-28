class ImageLayer {
  constructor(frame, options) {
    this.frame = frame;
    this.img = frame.querySelector(".layer-image");
    this.empty = frame.querySelector(".layer-empty");
    this.options = options;
    this.drag = null;
    this.bind();
  }

  model() {
    return this.options.get();
  }

  bind() {
    this.frame.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.frame.addEventListener(
      "wheel",
      (event) => {
        if (!this.options.isActive()) return;
        if (!this.model().src) return;
        event.preventDefault();
        const next = Utils.clamp(this.model().scale + (event.deltaY < 0 ? 0.06 : -0.06), 1, 3);
        this.options.patch({ scale: Number(next.toFixed(3)) });
      },
      { passive: false }
    );
    this.frame.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    this.frame.addEventListener("drop", (event) => {
      event.preventDefault();
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file && file.type.indexOf("image/") === 0) this.options.onUpload(file);
    });
    this.frame.addEventListener("click", (event) => {
      if (event.target.closest(".text-box") || event.target.closest(".day-cell")) return;
      if (this.options.onSelect) this.options.onSelect();
      if (!this.model().src && this.options.isActive() && this.options.onEmptyClick) this.options.onEmptyClick();
    });
  }

  onPointerDown(event) {
    if (!this.options.isActive()) return;
    if (event.button !== 0) return;
    if (event.target.closest(".text-box") || event.target.closest(".day-cell")) return;
    if (!this.model().src) return;
    event.preventDefault();
    this.frame.setPointerCapture(event.pointerId);
    this.drag = {
      x: event.clientX,
      y: event.clientY,
      ox: this.model().x,
      oy: this.model().y,
    };
    const move = (ev) => {
      if (!this.drag) return;
      const rect = this.frame.getBoundingClientRect();
      const dx = ((ev.clientX - this.drag.x) / rect.width) * 100;
      const dy = ((ev.clientY - this.drag.y) / rect.height) * 100;
      this.options.patch({
        x: Utils.clamp(this.drag.ox + dx, -80, 80),
        y: Utils.clamp(this.drag.oy + dy, -80, 80),
      });
    };
    const up = () => {
      this.drag = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  apply() {
    const model = this.model();
    this.frame.classList.toggle("has-image", Boolean(model.src));
    if (!model.src) {
      this.img.removeAttribute("src");
      return;
    }
    if (this.img.getAttribute("src") !== model.src) this.img.src = model.src;
    this.img.style.opacity = String(model.opacity);
    const layout = () => {
      const fw = this.frame.clientWidth;
      const fh = this.frame.clientHeight;
      if (!fw || !fh) return;
      const rect = Utils.computeCoverRect(
        fw,
        fh,
        this.img.naturalWidth,
        this.img.naturalHeight,
        model.scale,
        model.x,
        model.y
      );
      this.img.style.left = (rect.x / fw) * 100 + "%";
      this.img.style.top = (rect.y / fh) * 100 + "%";
      this.img.style.width = (rect.w / fw) * 100 + "%";
      this.img.style.height = (rect.h / fh) * 100 + "%";
    };
    if (this.img.naturalWidth) layout();
    else this.img.onload = layout;
  }
}
