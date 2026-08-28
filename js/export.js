class ExportController {
  constructor(app) {
    this.app = app;
    this.renderer = new CanvasRenderer(app);
  }

  monthsToExport(scope) {
    if (scope === "current") return [this.app.state.data.currentMonth];
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  applyPrintPageStyle() {
    const size = PAGE_SIZES[this.app.state.data.pageSize];
    const tag = document.getElementById("dynamic-print-style");
    tag.textContent =
      "@page { size: " +
      size.cssPage +
      "; margin: 0; } " +
      "@media print { .print-root .page { width: " +
      size.cssWidth +
      " !important; height: " +
      size.cssHeight +
      " !important; } }";
  }

  async waitForImages(root) {
    const images = Utils.$$("img", root);
    await Promise.all(
      images.map((img) => {
        if (!img.src || img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async print(scope, holeGuide) {
    const root = document.getElementById("print-root");
    root.innerHTML = "";
    this.app.state.data.printHoleGuide = holeGuide;
    this.applyPrintPageStyle();
    const months = this.monthsToExport(scope);
    months.forEach((monthIndex) => {
      const page = Utils.el("article");
      PageView.stamp(page, this.app, monthIndex, { holeGuide: holeGuide });
      root.appendChild(page);
    });
    await this.waitForImages(root);
    const cleanup = () => {
      root.innerHTML = "";
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  async savePdf(scope, holeGuide, onProgress) {
    const state = this.app.state.data;
    state.printHoleGuide = holeGuide;
    const size = PAGE_SIZES[state.pageSize];
    const pdf = new PdfWriter(size.widthPt, size.heightPt);
    const months = this.monthsToExport(scope);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    for (let i = 0; i < months.length; i++) {
      if (onProgress) onProgress(i + 1, months.length);
      const canvas = await this.renderer.renderMonth(months[i], 150);
      const jpeg = await this.canvasToJpeg(canvas, 0.92);
      pdf.addJpegPage(jpeg, canvas.width, canvas.height);
    }
    const blob = pdf.compile();
    Utils.downloadBlob(blob, "calendar-" + state.year + ".pdf");
  }

  canvasToJpeg(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not encode page"));
            return;
          }
          blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
        },
        "image/jpeg",
        quality
      );
    });
  }
}
