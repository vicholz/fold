class CalendarDesignerApp {
  constructor() {
    this.state = new AppState(new Date().getFullYear());
    this.events = new EventStore(this.state);
    this.store = new ProjectStore();
    this.ui = new UiController(this);
    this.page = new PageView(Utils.$("#page"), this);
    this.exporter = new ExportController(this);
    this.ui.app = this;
    this.ui.fillFonts();
    this.ui.fillPageSizes();
    this.state.subscribe(() => this.render());
    window.addEventListener("resize", Utils.debounce(() => this.fitStage(), 80));
    document.addEventListener("dragover", (event) => event.preventDefault());
    document.addEventListener("drop", (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (!file) return;
      const name = (file.name || "").toLowerCase();
      if (name.endsWith(".ics") || file.type === "text/calendar") {
        event.preventDefault();
        Utils.readText(file).then((text) => {
          const result = this.events.importIcsText(text, this.state.data.year);
          Utils.toast("Imported " + result.added + " events from " + result.parsed + " calendar items", "ok");
          this.ui.setTab("events");
        });
      }
    });
    this.boot();
  }

  async boot() {
    const saved = await this.store.load();
    if (saved && saved.year) this.state.replace(saved);
    this.ui.setTab("photo");
    this.render();
    this.state.subscribe(
      Utils.debounce(() => {
        this.store.save(this.state.toJSON());
      }, 700)
    );
  }

  render() {
    this.ui.sync();
    this.page.refresh();
    this.fitStage();
  }

  fitStage() {
    const wrap = Utils.$(".stage-scroll");
    const page = Utils.$("#page");
    const stage = Utils.$("#page-stage");
    const fit = Utils.$("#page-fit");
    if (!wrap || !page.offsetWidth) return;
    const pad = 28;
    const scale = Math.min((wrap.clientWidth - pad) / page.offsetWidth, (wrap.clientHeight - pad) / page.offsetHeight, 1);
    stage.style.transform = "scale(" + scale + ")";
    fit.style.width = page.offsetWidth * scale + "px";
    fit.style.height = page.offsetHeight * scale + "px";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  window.app = new CalendarDesignerApp();
});
