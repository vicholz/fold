class UiController {
  constructor(app) {
    this.app = app;
    this.tab = "photo";
    this.overlayTarget = "top";
    this.selectedDay = null;
    this.editingEventId = null;
    this.cropTarget = "photo";
    this.crop = new CropDialog(Utils.$("#crop-dialog"));
    this.bind();
  }

  bind() {
    Utils.$$(".tabs [data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => this.setTab(btn.dataset.tab));
    });
    Utils.$$("[data-overlay-target]").forEach((btn) => {
      btn.addEventListener("click", () => this.setOverlayTarget(btn.dataset.overlayTarget));
    });

    Utils.$("#year-input").addEventListener("change", (e) => {
      this.app.state.setYear(Number(e.target.value) || this.app.state.data.year);
    });
    Utils.$("#prev-month").addEventListener("click", () => this.shiftMonth(-1));
    Utils.$("#next-month").addEventListener("click", () => this.shiftMonth(1));
    Utils.$("#page-size").addEventListener("change", (e) => {
      this.app.state.setPageSize(e.target.value);
      this.app.fitStage();
    });
    Utils.$("#week-start").addEventListener("change", (e) => {
      this.app.state.setWeekStart(Number(e.target.value));
    });
    Utils.$("#show-hole").addEventListener("change", (e) => {
      this.app.state.data.showHangingHole = e.target.checked;
      this.app.state.emit();
    });

    this.bindImageControls("photo", "photo");
    this.bindImageControls("bg", "calendarBg");

    Utils.$("#overlay-enabled").addEventListener("change", (e) => {
      this.app.state.updateOverlay(this.overlayTarget, { enabled: e.target.checked });
    });
    Utils.$("#overlay-color").addEventListener("input", (e) => {
      this.app.state.updateOverlay(this.overlayTarget, { color: e.target.value });
    });
    Utils.$("#overlay-color-opacity").addEventListener("input", (e) => {
      this.app.state.updateOverlay(this.overlayTarget, { colorOpacity: Number(e.target.value) });
    });
    Utils.$("#overlay-image-opacity").addEventListener("input", (e) => {
      this.app.state.updateOverlay(this.overlayTarget, { imageOpacity: Number(e.target.value) });
    });
    Utils.$("#overlay-image-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (file) this.assignOverlayImage(file);
    });
    Utils.$("#overlay-image-remove").addEventListener("click", () => {
      this.app.state.updateOverlay(this.overlayTarget, { image: null });
    });
    Utils.$("#add-text").addEventListener("click", () => {
      const box = this.app.state.addText(this.overlayTarget);
      this.app.page.selectedOverlay = this.overlayTarget;
      this.app.page.selectedTextId = box.id;
      this.setTab("overlay");
    });
    Utils.$("#text-content").addEventListener("input", (e) => this.patchSelectedText({ content: e.target.value }));
    Utils.$("#text-font").addEventListener("change", (e) => this.patchSelectedText({ fontFamily: e.target.value }));
    Utils.$("#text-size").addEventListener("input", (e) => this.patchSelectedText({ fontSize: Number(e.target.value) }));
    Utils.$("#text-color").addEventListener("input", (e) => this.patchSelectedText({ color: e.target.value }));
    Utils.$("#text-opacity").addEventListener("input", (e) => this.patchSelectedText({ opacity: Number(e.target.value) }));
    Utils.$("#text-tracking").addEventListener("input", (e) => this.patchSelectedText({ letterSpacing: Number(e.target.value) }));
    Utils.$("#text-bg-color").addEventListener("input", (e) => this.patchSelectedText({ bgColor: e.target.value }));
    Utils.$("#text-bg-color-opacity").addEventListener("input", (e) => this.patchSelectedText({ bgColorOpacity: Number(e.target.value) }));
    Utils.$("#text-bg-image-opacity").addEventListener("input", (e) => this.patchSelectedText({ bgImageOpacity: Number(e.target.value) }));
    Utils.$("#text-bg-image-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (file) this.assignTextBgImage(file);
    });
    Utils.$("#text-bg-image-remove").addEventListener("click", () => {
      this.patchSelectedText({ bgImage: null });
    });
    Utils.$("#text-bold").addEventListener("click", () => this.toggleTextFlag("bold"));
    Utils.$("#text-italic").addEventListener("click", () => this.toggleTextFlag("italic"));
    Utils.$("#text-underline").addEventListener("click", () => this.toggleTextFlag("underline"));
    Utils.$$("[data-align]").forEach((btn) => {
      btn.addEventListener("click", () => this.patchSelectedText({ align: btn.dataset.align }));
    });
    Utils.$("#text-delete").addEventListener("click", () => {
      const id = this.app.page.selectedTextId;
      if (!id) return;
      this.app.state.removeText(this.overlayTarget, id);
      this.app.page.selectedTextId = null;
    });

    Utils.$("#grid-title").addEventListener("change", (e) => this.patchGrid({ showTitle: e.target.checked }));
    Utils.$("#grid-events").addEventListener("change", (e) => this.patchGrid({ showEventTitles: e.target.checked }));
    Utils.$("#grid-title-color").addEventListener("input", (e) => this.patchGrid({ titleColor: e.target.value }));
    Utils.$("#grid-number-color").addEventListener("input", (e) => this.patchGrid({ numberColor: e.target.value }));
    Utils.$("#grid-weekend-color").addEventListener("input", (e) => this.patchGrid({ weekendColor: e.target.value }));
    Utils.$("#grid-label-color").addEventListener("input", (e) => this.patchGrid({ labelColor: e.target.value }));
    Utils.$("#grid-line-color").addEventListener("input", (e) => this.patchGrid({ lineColor: e.target.value }));

    Utils.$("#ics-input").addEventListener("change", (e) => this.importIcs(e));
    Utils.$("#toolbar-ics").addEventListener("click", () => Utils.$("#ics-input").click());
    Utils.$("#add-event").addEventListener("click", () => this.openEventDialog(null));
    Utils.$("#clear-day-filter").addEventListener("click", () => {
      this.selectedDay = null;
      this.app.page.selectedDay = null;
      this.app.page.refresh();
      this.syncEvents();
    });
    Utils.$("#toolbar-add-event").addEventListener("click", () => this.openEventDialog(null));
    Utils.$("#event-save").addEventListener("click", (e) => {
      e.preventDefault();
      this.saveEvent();
    });
    Utils.$("#event-cancel").addEventListener("click", () => Utils.$("#event-dialog").close());
    Utils.$("#event-delete").addEventListener("click", () => {
      if (this.editingEventId) this.app.events.remove(this.editingEventId);
      Utils.$("#event-dialog").close();
    });
    EVENT_COLORS.forEach((color) => {
      const swatch = Utils.el("button", {
        class: "swatch",
        type: "button",
        "data-color": color,
        style: { background: color },
      });
      swatch.addEventListener("click", () => {
        Utils.$("#event-color").value = color;
        this.markSwatch(color);
      });
      Utils.$("#event-swatches").appendChild(swatch);
    });

    Utils.$("#export-open").addEventListener("click", () => Utils.$("#export-dialog").showModal());
    Utils.$("#export-cancel").addEventListener("click", () => Utils.$("#export-dialog").close());
    Utils.$("#export-print").addEventListener("click", async () => {
      const scope = Utils.$("#export-scope").value;
      const hole = Utils.$("#export-hole").checked;
      Utils.$("#export-dialog").close();
      await this.app.exporter.print(scope, hole);
    });
    Utils.$("#export-pdf").addEventListener("click", async () => {
      const scope = Utils.$("#export-scope").value;
      const hole = Utils.$("#export-hole").checked;
      Utils.$("#export-status").textContent = "Rendering pages…";
      try {
        await this.app.exporter.savePdf(scope, hole, (done, total) => {
          Utils.$("#export-status").textContent = "Rendering page " + done + " of " + total + "…";
        });
        Utils.$("#export-status").textContent = "";
        Utils.$("#export-dialog").close();
        Utils.toast("PDF saved", "ok");
      } catch (err) {
        Utils.$("#export-status").textContent = "Could not build PDF.";
        console.error(err);
      }
    });

    Utils.$("#save-project").addEventListener("click", () => {
      Utils.downloadText(
        JSON.stringify({ version: 1, project: this.app.state.toJSON() }, null, 2),
        "calendar-" + this.app.state.data.year + ".json",
        "application/json"
      );
    });
    Utils.$("#load-project").addEventListener("click", () => Utils.$("#project-input").click());
    Utils.$("#project-input").addEventListener("change", (e) => this.loadProject(e));

    document.addEventListener("keydown", (e) => this.onKey(e));
  }

  bindImageControls(prefix, which) {
    Utils.$("#" + prefix + "-scale").addEventListener("input", (e) => {
      this.app.state.updateImage(which, { scale: Number(e.target.value) });
    });
    Utils.$("#" + prefix + "-opacity").addEventListener("input", (e) => {
      this.app.state.updateImage(which, { opacity: Number(e.target.value) });
    });
    Utils.$("#" + prefix + "-reset").addEventListener("click", () => {
      this.app.state.updateImage(which, { scale: 1, x: 0, y: 0 });
    });
    Utils.$("#" + prefix + "-remove").addEventListener("click", () => {
      this.app.state.updateImage(which, { src: null, originalSrc: null, scale: 1, x: 0, y: 0, opacity: 1 });
    });
    Utils.$("#" + prefix + "-input").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";
      if (file) this.assignImage(which, file);
    });
    Utils.$("#" + prefix + "-crop").addEventListener("click", () => {
      const model = this.app.state.month()[which];
      const src = model.originalSrc || model.src;
      if (!src) return;
      this.cropTarget = which;
      this.crop.open(src, (cropped) => {
        this.app.state.updateImage(which, { src: cropped, scale: 1, x: 0, y: 0 });
      });
    });
  }

  pickImage(which) {
    const id = which === "photo" ? "#photo-input" : "#bg-input";
    Utils.$(id).click();
  }

  async assignImage(which, file) {
    try {
      const normalized = await Utils.normalizeImageFile(file);
      this.app.state.updateImage(which, {
        src: normalized.src,
        originalSrc: normalized.src,
        scale: 1,
        x: 0,
        y: 0,
      });
    } catch (err) {
      Utils.toast("Could not read that image", "danger");
    }
  }

  async assignOverlayImage(file) {
    try {
      const normalized = await Utils.normalizeImageFile(file);
      this.app.state.updateOverlay(this.overlayTarget, {
        image: normalized.src,
        enabled: true,
      });
    } catch (err) {
      Utils.toast("Could not read that image", "danger");
    }
  }

  async assignTextBgImage(file) {
    try {
      const normalized = await Utils.normalizeImageFile(file);
      this.patchSelectedText({ bgImage: normalized.src, bgImageOpacity: this.selectedText() && this.selectedText().bgImageOpacity != null ? this.selectedText().bgImageOpacity : 1 });
    } catch (err) {
      Utils.toast("Could not read that image", "danger");
    }
  }

  patchGrid(partial) {
    this.app.state.updateMonth({ grid: Object.assign({}, this.app.state.month().grid, partial) });
  }

  selectedText() {
    const id = this.app.page.selectedTextId;
    if (!id) return null;
    return this.app.state.overlay(this.overlayTarget).texts.find((t) => t.id === id) || null;
  }

  patchSelectedText(partial) {
    const id = this.app.page.selectedTextId;
    if (!id) return;
    this.app.state.updateText(this.overlayTarget, id, partial);
  }

  toggleTextFlag(key) {
    const box = this.selectedText();
    if (!box) return;
    const patch = {};
    patch[key] = !box[key];
    this.patchSelectedText(patch);
  }

  setTab(tab) {
    this.tab = tab;
    Utils.$$(".tabs [data-tab]").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tab === tab));
    Utils.$$(".panel-section").forEach((section) => {
      section.classList.toggle("is-active", section.dataset.section === tab);
    });
    this.app.page.setMode(tab === "overlay" ? "overlay" : tab);
  }

  setOverlayTarget(target) {
    this.overlayTarget = target;
    Utils.$$("[data-overlay-target]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.overlayTarget === target);
    });
    this.app.page.selectedOverlay = target;
    this.sync();
  }

  setSelectedDay(iso) {
    this.selectedDay = iso;
    this.syncEvents();
  }

  shiftMonth(delta) {
    const next = this.app.state.data.currentMonth + delta;
    if (next < 0) {
      this.app.state.data.currentMonth = 11;
      this.app.state.setYear(this.app.state.data.year - 1);
    } else if (next > 11) {
      this.app.state.data.currentMonth = 0;
      this.app.state.setYear(this.app.state.data.year + 1);
    } else {
      this.app.state.setMonth(next);
    }
  }

  onKey(event) {
    const tag = event.target && event.target.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable;
    if (event.key === "Delete" || event.key === "Backspace") {
      if (typing) return;
      if (this.tab === "overlay" && this.app.page.selectedTextId) {
        event.preventDefault();
        this.app.state.removeText(this.overlayTarget, this.app.page.selectedTextId);
        this.app.page.selectedTextId = null;
      }
    }
    if (typing) return;
    if (event.key === "ArrowLeft") this.shiftMonth(-1);
    if (event.key === "ArrowRight") this.shiftMonth(1);
  }

  async importIcs(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await Utils.readText(file);
      const result = this.app.events.importIcsText(text, this.app.state.data.year);
      Utils.toast("Imported " + result.added + " events from " + result.parsed + " calendar items", "ok");
      this.setTab("events");
    } catch (err) {
      Utils.toast("Could not read that calendar file", "danger");
    }
  }

  openEventDialog(preset) {
    const start = (preset && preset.start) || this.selectedDay || Utils.isoDate(new Date(this.app.state.data.year, this.app.state.data.currentMonth, 1));
    const event = preset && preset.id ? preset : {
      id: null,
      title: "",
      start: start,
      end: (preset && preset.end) || start,
      allDay: true,
      description: "",
      color: EVENT_COLORS[0],
    };
    this.editingEventId = event.id;
    Utils.$("#event-title").value = event.title || "";
    Utils.$("#event-start").value = event.start;
    Utils.$("#event-end").value = event.end || event.start;
    Utils.$("#event-allday").checked = event.allDay !== false;
    Utils.$("#event-description").value = event.description || "";
    Utils.$("#event-color").value = event.color || EVENT_COLORS[0];
    this.markSwatch(Utils.$("#event-color").value);
    Utils.$("#event-delete").hidden = !event.id;
    Utils.$("#event-dialog").showModal();
  }

  saveEvent() {
    const payload = {
      title: Utils.$("#event-title").value,
      start: Utils.$("#event-start").value,
      end: Utils.$("#event-end").value || Utils.$("#event-start").value,
      allDay: Utils.$("#event-allday").checked,
      description: Utils.$("#event-description").value,
      color: Utils.$("#event-color").value,
      source: "manual",
    };
    if (!payload.title.trim()) {
      Utils.$("#event-title").focus();
      return;
    }
    if (this.editingEventId) this.app.events.update(this.editingEventId, payload);
    else this.app.events.add(payload);
    Utils.$("#event-dialog").close();
  }

  markSwatch(color) {
    Utils.$$("#event-swatches .swatch").forEach((node) => {
      node.classList.toggle("is-on", node.dataset.color === color);
    });
  }

  async loadProject(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await Utils.readText(file);
      const parsed = JSON.parse(text);
      this.app.state.replace(parsed.project || parsed);
      Utils.toast("Project loaded", "ok");
    } catch (err) {
      Utils.toast("Could not open that project file", "danger");
    }
  }

  renderMonths() {
    const host = Utils.$("#month-list");
    const current = this.app.state.data.currentMonth;
    host.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const btn = Utils.el("button", {
        class:
          "month-btn" +
          (i === current ? " is-active" : "") +
          (this.app.state.data.months[i].photo.src ? " has-photo" : ""),
        type: "button",
      });
      btn.appendChild(Utils.el("span", { text: Utils.monthName(i, this.app.state.data.year) }));
      btn.appendChild(Utils.el("span", { class: "dot" }));
      btn.addEventListener("click", () => this.app.state.setMonth(i));
      host.appendChild(btn);
    }
  }

  syncEvents() {
    const year = this.app.state.data.year;
    const month = this.app.state.data.currentMonth;
    const host = Utils.$("#event-list");
    host.innerHTML = "";
    let events = this.selectedDay ? this.app.events.forDate(this.selectedDay) : this.app.events.forMonth(year, month);
    Utils.$("#events-filter").textContent = this.selectedDay
      ? "Events on " + this.selectedDay
      : "Events in " + Utils.monthName(month, year);
    if (!events.length) {
      host.appendChild(Utils.el("div", { class: "empty-note", text: "No events yet. Import an ICS file or add one." }));
      return;
    }
    events.forEach((event) => {
      const item = Utils.el("div", { class: "event-item" });
      item.appendChild(Utils.el("div", { class: "mark", style: { background: event.color } }));
      const body = Utils.el("div");
      body.appendChild(Utils.el("h4", { text: event.title }));
      const range = event.start === event.end ? event.start : event.start + " → " + event.end;
      body.appendChild(Utils.el("p", { text: range + (event.source === "ics" ? " · imported" : "") }));
      item.appendChild(body);
      const mini = Utils.el("div", { class: "mini" });
      const edit = Utils.el("button", { class: "btn btn-ghost", type: "button", text: "Edit" });
      const del = Utils.el("button", { class: "btn btn-ghost", type: "button", text: "Remove" });
      edit.addEventListener("click", () => this.openEventDialog(event));
      del.addEventListener("click", () => this.app.events.remove(event.id));
      mini.appendChild(edit);
      mini.appendChild(del);
      item.appendChild(mini);
      host.appendChild(item);
    });
  }

  fillFonts() {
    const select = Utils.$("#text-font");
    if (select.options.length) return;
    TEXT_FONTS.forEach((font) => {
      select.appendChild(Utils.el("option", { value: font.value, text: font.name }));
    });
  }

  fillPageSizes() {
    const select = Utils.$("#page-size");
    if (select.options.length) return;
    Object.keys(PAGE_SIZES).forEach((id) => {
      const size = PAGE_SIZES[id];
      select.appendChild(Utils.el("option", { value: id, text: size.label + " · " + size.detail }));
    });
  }

  sync() {
    const state = this.app.state.data;
    const month = this.app.state.month();
    if (this.selectedDay) {
      const selected = Utils.parseIso(this.selectedDay);
      if (selected.getMonth() !== state.currentMonth || selected.getFullYear() !== state.year) {
        this.selectedDay = null;
        if (this.app.page) this.app.page.selectedDay = null;
      }
    }
    Utils.$("#year-input").value = String(state.year);
    Utils.$("#month-label").textContent = Utils.monthName(state.currentMonth, state.year);
    Utils.$("#page-size").value = state.pageSize;
    Utils.$("#week-start").value = String(state.weekStartsOn);
    Utils.$("#show-hole").checked = state.showHangingHole;
    this.renderMonths();

    const photo = month.photo;
    Utils.$("#photo-scale").value = photo.scale;
    Utils.$("#photo-scale-val").textContent = photo.scale.toFixed(2) + "×";
    Utils.$("#photo-opacity").value = photo.opacity;
    Utils.$("#photo-opacity-val").textContent = Math.round(photo.opacity * 100) + "%";
    Utils.$("#photo-crop").disabled = !photo.src;
    Utils.$("#photo-remove").disabled = !photo.src;

    const bg = month.calendarBg;
    Utils.$("#bg-scale").value = bg.scale;
    Utils.$("#bg-scale-val").textContent = bg.scale.toFixed(2) + "×";
    Utils.$("#bg-opacity").value = bg.opacity;
    Utils.$("#bg-opacity-val").textContent = Math.round(bg.opacity * 100) + "%";
    Utils.$("#bg-crop").disabled = !bg.src;
    Utils.$("#bg-remove").disabled = !bg.src;

    const overlay = this.app.state.overlay(this.overlayTarget);
    Utils.$("#overlay-enabled").checked = overlay.enabled;
    Utils.$("#overlay-color").value = overlay.color;
    Utils.$("#overlay-color-opacity").value = overlay.colorOpacity;
    Utils.$("#overlay-color-opacity-val").textContent = Math.round(overlay.colorOpacity * 100) + "%";
    Utils.$("#overlay-image-opacity").value = overlay.imageOpacity;
    Utils.$("#overlay-image-opacity-val").textContent = Math.round(overlay.imageOpacity * 100) + "%";

    const box = this.selectedText();
    const editor = Utils.$("#text-editor");
    editor.hidden = !box;
    Utils.$("#text-empty").hidden = Boolean(box);
    if (box) {
      Utils.$("#text-content").value = box.content;
      Utils.$("#text-font").value = box.fontFamily;
      Utils.$("#text-size").value = box.fontSize;
      Utils.$("#text-size-val").textContent = box.fontSize + " pt";
      Utils.$("#text-color").value = box.color;
      Utils.$("#text-opacity").value = box.opacity;
      Utils.$("#text-opacity-val").textContent = Math.round(box.opacity * 100) + "%";
      Utils.$("#text-tracking").value = box.letterSpacing || 0;
      Utils.$("#text-bg-color").value = box.bgColor || "#1a1410";
      Utils.$("#text-bg-color-opacity").value = box.bgColorOpacity || 0;
      Utils.$("#text-bg-color-opacity-val").textContent = Math.round((box.bgColorOpacity || 0) * 100) + "%";
      Utils.$("#text-bg-image-opacity").value = box.bgImageOpacity != null ? box.bgImageOpacity : 1;
      Utils.$("#text-bg-image-opacity-val").textContent = Math.round((box.bgImageOpacity != null ? box.bgImageOpacity : 1) * 100) + "%";
      Utils.$("#text-bg-image-remove").disabled = !box.bgImage;
      Utils.$("#text-bold").classList.toggle("is-on", box.bold);
      Utils.$("#text-italic").classList.toggle("is-on", box.italic);
      Utils.$("#text-underline").classList.toggle("is-on", box.underline);
      Utils.$$("[data-align]").forEach((btn) => btn.classList.toggle("is-on", btn.dataset.align === box.align));
    }

    Utils.$("#grid-title").checked = month.grid.showTitle;
    Utils.$("#grid-events").checked = month.grid.showEventTitles;
    Utils.$("#grid-title-color").value = month.grid.titleColor;
    Utils.$("#grid-number-color").value = month.grid.numberColor;
    Utils.$("#grid-weekend-color").value = month.grid.weekendColor;
    Utils.$("#grid-label-color").value = month.grid.labelColor;
    Utils.$("#grid-line-color").value = month.grid.lineColor;

    const size = PAGE_SIZES[state.pageSize];
    Utils.$("#stage-caption").textContent =
      size.detail + "  ·  bi-fold hanging  ·  " + Utils.monthName(state.currentMonth, state.year) + " " + state.year;

    this.syncEvents();
  }
}
