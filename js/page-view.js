class PageView {
  constructor(pageEl, app) {
    this.pageEl = pageEl;
    this.app = app;
    this.selectedTextId = null;
    this.selectedOverlay = "top";
    this.selectedDay = null;
    this.build();
  }

  build() {
    this.pageEl.classList.add("page", "is-interactive", "show-hole");
    this.pageEl.innerHTML =
      '<div class="hanging-hole"></div>' +
      '<section class="panel panel-top" data-panel="top">' +
      '<div class="image-frame" id="photo-frame">' +
      '<img class="layer-image" alt="" draggable="false" />' +
      '<div class="layer-empty"><strong>Month photo</strong><span>Drop an image or click to upload</span></div>' +
      "</div>" +
      '<div class="overlay" data-overlay="top">' +
      '<div class="overlay-image"></div><div class="overlay-color"></div><div class="overlay-texts"></div>' +
      "</div>" +
      "</section>" +
      '<div class="fold-line"><span>fold</span></div>' +
      '<section class="panel panel-bottom" data-panel="bottom">' +
      '<div class="image-frame" id="bg-frame">' +
      '<img class="layer-image" alt="" draggable="false" />' +
      '<div class="layer-empty"><strong>Calendar background</strong><span>Optional image behind the grid</span></div>' +
      "</div>" +
      '<div class="overlay" data-overlay="bottom">' +
      '<div class="overlay-image"></div><div class="overlay-color"></div><div class="overlay-texts"></div>' +
      "</div>" +
      '<div class="calendar-body" id="calendar-body"></div>' +
      "</section>";

    this.hole = this.pageEl.querySelector(".hanging-hole");
    this.photo = new ImageLayer(this.pageEl.querySelector("#photo-frame"), {
      get: () => this.app.state.month().photo,
      patch: (partial) => this.app.state.updateImage("photo", partial),
      isActive: () => this.pageEl.dataset.mode === "photo",
      onSelect: () => this.app.ui.setTab("photo"),
      onEmptyClick: () => this.app.ui.pickImage("photo"),
      onUpload: (file) => this.app.ui.assignImage("photo", file),
    });
    this.bg = new ImageLayer(this.pageEl.querySelector("#bg-frame"), {
      get: () => this.app.state.month().calendarBg,
      patch: (partial) => this.app.state.updateImage("calendarBg", partial),
      isActive: () => this.pageEl.dataset.mode === "calendar",
      onSelect: () => this.app.ui.setTab("calendar"),
      onEmptyClick: () => this.app.ui.pickImage("calendarBg"),
      onUpload: (file) => this.app.ui.assignImage("calendarBg", file),
    });
    this.topOverlay = new OverlayLayer(this.pageEl.querySelector('[data-overlay="top"]'), {
      interactive: true,
      get: () => this.app.state.month().topOverlay,
      onSelect: (id) => this.selectText("top", id),
      patchText: (id, partial) => this.app.state.updateText("top", id, partial),
    });
    this.bottomOverlay = new OverlayLayer(this.pageEl.querySelector('[data-overlay="bottom"]'), {
      interactive: true,
      get: () => this.app.state.month().bottomOverlay,
      onSelect: (id) => this.selectText("bottom", id),
      patchText: (id, partial) => this.app.state.updateText("bottom", id, partial),
    });
    this.grid = new CalendarGrid(this.pageEl.querySelector("#calendar-body"), {
      onDayClick: (iso) => {
        this.selectedDay = iso;
        this.app.ui.setTab("events");
        this.app.ui.setSelectedDay(iso);
        this.refresh();
      },
      onDayCreate: (iso) => this.app.ui.openEventDialog({ start: iso, end: iso }),
    });

    this.pageEl.addEventListener("click", (event) => {
      if (event.target.closest(".text-box") || event.target.closest(".day-cell")) return;
      if (event.target.closest(".panel-top")) {
        if (this.pageEl.dataset.mode === "overlay") this.app.ui.setOverlayTarget("top");
      }
    });
  }

  selectText(target, id) {
    this.selectedOverlay = target;
    this.selectedTextId = id;
    this.app.ui.setOverlayTarget(target);
    this.app.ui.setTab("overlay");
    this.app.ui.sync();
    this.refresh();
  }

  setMode(mode) {
    this.pageEl.dataset.mode = mode;
  }

  refresh() {
    const state = this.app.state.data;
    const month = this.app.state.month();
    const year = state.year;
    this.pageEl.dataset.size = state.pageSize;
    this.pageEl.classList.toggle("show-hole", Boolean(state.showHangingHole));
    this.hole.classList.toggle("is-guide", false);
    this.photo.apply();
    this.bg.apply();
    const selectedTop = this.selectedOverlay === "top" ? this.selectedTextId : null;
    const selectedBottom = this.selectedOverlay === "bottom" ? this.selectedTextId : null;
    this.topOverlay.apply(selectedTop);
    this.bottomOverlay.apply(selectedBottom);
    const eventsByDay = this.app.events.groupedByDay(year, state.currentMonth);
    this.grid.render(
      year,
      state.currentMonth,
      state.weekStartsOn,
      eventsByDay,
      month.grid,
      true,
      this.selectedDay
    );
  }

  static stamp(target, app, monthIndex, options) {
    options = options || {};
    const state = app.state.data;
    const month = state.months[monthIndex];
    target.className = "page print-page";
    if (options.holeGuide) target.classList.add("show-hole");
    target.dataset.size = state.pageSize;
    target.innerHTML =
      '<div class="hanging-hole' + (options.holeGuide ? " is-guide" : "") + '"></div>' +
      '<section class="panel panel-top">' +
      '<div class="image-frame" id="stamp-photo"><img class="layer-image" alt="" /></div>' +
      '<div class="overlay"><div class="overlay-image"></div><div class="overlay-color"></div><div class="overlay-texts"></div></div>' +
      "</section>" +
      '<section class="panel panel-bottom">' +
      '<div class="image-frame" id="stamp-bg"><img class="layer-image" alt="" /></div>' +
      '<div class="overlay"><div class="overlay-image"></div><div class="overlay-color"></div><div class="overlay-texts"></div></div>' +
      '<div class="calendar-body"></div>' +
      "</section>";

    const applyImage = (frame, model) => {
      const img = frame.querySelector(".layer-image");
      if (!model.src) return;
      const size = PAGE_SIZES[state.pageSize];
      const fw = size.widthIn;
      const fh = size.heightIn / 2;
      frame.classList.add("has-image");
      img.src = model.src;
      img.style.opacity = String(model.opacity);
      const layout = () => {
        const rect = Utils.computeCoverRect(
          fw,
          fh,
          img.naturalWidth,
          img.naturalHeight,
          model.scale,
          model.x,
          model.y
        );
        img.style.left = (rect.x / fw) * 100 + "%";
        img.style.top = (rect.y / fh) * 100 + "%";
        img.style.width = (rect.w / fw) * 100 + "%";
        img.style.height = (rect.h / fh) * 100 + "%";
      };
      if (img.naturalWidth) layout();
      else img.onload = layout;
    };

    applyImage(target.querySelector("#stamp-photo"), month.photo);
    applyImage(target.querySelector("#stamp-bg"), month.calendarBg);

    const applyOverlay = (overlayRoot, model) => {
      const colorEl = overlayRoot.querySelector(".overlay-color");
      const imageEl = overlayRoot.querySelector(".overlay-image");
      const textsEl = overlayRoot.querySelector(".overlay-texts");
      colorEl.style.background = model.enabled ? Utils.hexToRgba(model.color, model.colorOpacity) : "transparent";
      if (model.enabled && model.image) {
        imageEl.style.backgroundImage = "url(" + model.image + ")";
        imageEl.style.opacity = String(model.imageOpacity);
      }
      (model.texts || []).forEach((box) => {
        textsEl.appendChild(OverlayLayer.buildTextBox(box, false));
      });
    };

    applyOverlay(target.querySelector(".panel-top .overlay"), month.topOverlay);
    applyOverlay(target.querySelector(".panel-bottom .overlay"), month.bottomOverlay);

    const grid = new CalendarGrid(target.querySelector(".calendar-body"), {});
    grid.render(
      state.year,
      monthIndex,
      state.weekStartsOn,
      app.events.groupedByDay(state.year, monthIndex),
      month.grid,
      false,
      null
    );
  }
}
