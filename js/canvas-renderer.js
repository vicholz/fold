class CanvasRenderer {
  constructor(app) {
    this.app = app;
    this.imageCache = new Map();
  }

  async image(src) {
    if (!src) return null;
    if (this.imageCache.has(src)) return this.imageCache.get(src);
    const img = await Utils.loadImage(src);
    this.imageCache.set(src, img);
    return img;
  }

  async renderMonth(monthIndex, dpi) {
    const state = this.app.state.data;
    const size = PAGE_SIZES[state.pageSize];
    const width = Math.round(size.widthIn * dpi);
    const height = Math.round(size.heightIn * dpi);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4eee4";
    ctx.fillRect(0, 0, width, height);

    const month = state.months[monthIndex];
    const top = { x: 0, y: 0, w: width, h: Math.round(height / 2) };
    const bottom = { x: 0, y: top.h, w: width, h: height - top.h };

    await this.drawImageLayer(ctx, top, month.photo);
    await this.drawOverlay(ctx, top, month.topOverlay);
    await this.drawImageLayer(ctx, bottom, month.calendarBg);
    await this.drawOverlay(ctx, bottom, month.bottomOverlay);
    this.drawGrid(ctx, bottom, state, monthIndex, month.grid, dpi);

    if (state.printHoleGuide) {
      const r = 0.15 * dpi;
      ctx.beginPath();
      ctx.arc(width / 2, 0.32 * dpi + r, r, 0, Math.PI * 2);
      ctx.strokeStyle = "#7a7368";
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = Math.max(1, dpi / 96);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    return canvas;
  }

  async drawImageLayer(ctx, frame, model) {
    if (!model || !model.src) return;
    const img = await this.image(model.src);
    if (!img) return;
    const rect = Utils.computeCoverRect(frame.w, frame.h, img.naturalWidth, img.naturalHeight, model.scale, model.x, model.y);
    ctx.save();
    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.w, frame.h);
    ctx.clip();
    ctx.globalAlpha = model.opacity;
    ctx.drawImage(img, frame.x + rect.x, frame.y + rect.y, rect.w, rect.h);
    ctx.restore();
  }

  async drawOverlay(ctx, frame, model) {
    if (!model || !model.enabled) {
      await this.drawTexts(ctx, frame, model && model.texts);
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(frame.x, frame.y, frame.w, frame.h);
    ctx.clip();
    if (model.image) {
      const img = await this.image(model.image);
      if (img) {
        const rect = Utils.computeCoverRect(frame.w, frame.h, img.naturalWidth, img.naturalHeight, 1, 0, 0);
        ctx.globalAlpha = model.imageOpacity;
        ctx.drawImage(img, frame.x + rect.x, frame.y + rect.y, rect.w, rect.h);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = Utils.hexToRgba(model.color, model.colorOpacity);
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
    ctx.restore();
    await this.drawTexts(ctx, frame, model.texts);
  }

  async drawTexts(ctx, frame, texts) {
    for (let i = 0; i < (texts || []).length; i++) {
      const box = texts[i];
      const x = frame.x + (box.x / 100) * frame.w;
      const y = frame.y + (box.y / 100) * frame.h;
      const w = (box.w / 100) * frame.w;
      const pt = box.fontSize || 18;
      const fontSize = pt * ((frame.w / PAGE_SIZES[this.app.state.data.pageSize].widthIn) / 72);
      const padX = fontSize * 0.55;
      const padY = fontSize * 0.28;
      const weight = box.bold ? "700" : "400";
      const italic = box.italic ? "italic " : "";
      ctx.save();
      ctx.textAlign = box.align === "center" ? "center" : box.align === "right" ? "right" : "left";
      ctx.textBaseline = "top";
      ctx.font = italic + weight + " " + fontSize + "px " + (box.fontFamily || "Georgia");
      if (box.letterSpacing) ctx.letterSpacing = box.letterSpacing + "px";
      const innerW = Math.max(8, w - padX * 2);
      const lines = Utils.wrapText(ctx, box.content, innerW);
      const lineHeight = fontSize * 1.2;
      const h = padY * 2 + Math.max(lineHeight, lines.length * lineHeight);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      if (box.bgImage) {
        const img = await this.image(box.bgImage);
        if (img) {
          const rect = Utils.computeCoverRect(w, h, img.naturalWidth, img.naturalHeight, 1, 0, 0);
          ctx.globalAlpha = box.bgImageOpacity != null ? box.bgImageOpacity : 1;
          ctx.drawImage(img, x + rect.x, y + rect.y, rect.w, rect.h);
        }
      }
      if (box.bgColorOpacity) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = Utils.hexToRgba(box.bgColor || "#1a1410", box.bgColorOpacity);
        ctx.fillRect(x, y, w, h);
      }
      ctx.globalAlpha = box.opacity;
      ctx.fillStyle = box.color;
      const startX =
        box.align === "center" ? x + w / 2 : box.align === "right" ? x + w - padX : x + padX;
      lines.forEach((line, lineIndex) => {
        const ly = y + padY + lineIndex * lineHeight;
        ctx.fillText(line, startX, ly, innerW);
        if (box.underline) {
          const width = ctx.measureText(line).width;
          const ux =
            box.align === "center" ? startX - width / 2 : box.align === "right" ? startX - width : startX;
          ctx.beginPath();
          ctx.strokeStyle = box.color;
          ctx.lineWidth = Math.max(1, fontSize / 16);
          ctx.moveTo(ux, ly + fontSize + 1);
          ctx.lineTo(ux + width, ly + fontSize + 1);
          ctx.stroke();
        }
      });
      ctx.restore();
    }
  }

  drawGrid(ctx, frame, state, monthIndex, grid, dpi) {
    const padX = 0.38 * dpi;
    const padTop = 0.42 * dpi;
    const padBottom = 0.32 * dpi;
    const x = frame.x + padX;
    const y = frame.y + padTop;
    const w = frame.w - padX * 2;
    const h = frame.h - padTop - padBottom;
    const year = state.year;
    const title = Utils.monthName(monthIndex, year) + " " + year;
    let gridTop = y;
    if (grid.showTitle) {
      ctx.fillStyle = grid.titleColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "600 " + 22 * (dpi / 72) + "px Fraunces, Georgia, serif";
      ctx.fillText(title, x + w / 2, y);
      gridTop += 0.38 * dpi;
    }
    const names = state.weekStartsOn === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN;
    const labelH = 0.22 * dpi;
    ctx.font = "500 " + 8 * (dpi / 72) + "px Outfit, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = grid.labelColor;
    names.forEach((name, i) => {
      ctx.fillText(name, x + ((i + 0.5) * w) / 7, gridTop + labelH / 2);
    });
    const bodyY = gridTop + labelH;
    const bodyH = h - (bodyY - y);
    const cellW = w / 7;
    const cellH = bodyH / 6;
    ctx.strokeStyle = grid.lineColor;
    ctx.lineWidth = Math.max(1, dpi / 140);
    for (let r = 0; r <= 6; r++) {
      ctx.beginPath();
      ctx.moveTo(x, bodyY + r * cellH);
      ctx.lineTo(x + w, bodyY + r * cellH);
      ctx.stroke();
    }
    for (let c = 0; c <= 7; c++) {
      ctx.beginPath();
      ctx.moveTo(x + c * cellW, bodyY);
      ctx.lineTo(x + c * cellW, bodyY + bodyH);
      ctx.stroke();
    }

    const first = new Date(year, monthIndex, 1);
    const startPad = (first.getDay() - state.weekStartsOn + 7) % 7;
    const days = Utils.daysInMonth(year, monthIndex);
    const eventsByDay = this.app.events.groupedByDay(year, monthIndex);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (let i = 0; i < 42; i++) {
      const dayNum = i - startPad + 1;
      if (dayNum < 1 || dayNum > days) continue;
      const col = i % 7;
      const row = Math.floor(i / 7);
      const cx = x + col * cellW;
      const cy = bodyY + row * cellH;
      const date = new Date(year, monthIndex, dayNum);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      ctx.fillStyle = weekend ? grid.weekendColor : grid.numberColor;
      ctx.font = "600 " + 10 * (dpi / 72) + "px Outfit, system-ui, sans-serif";
      ctx.fillText(String(dayNum), cx + 6, cy + 5);
      const iso = year + "-" + Utils.pad(monthIndex + 1) + "-" + Utils.pad(dayNum);
      const events = eventsByDay[iso] || [];
      const chipH = 11 * (dpi / 96);
      events.slice(0, 3).forEach((event, idx) => {
        const ey = cy + 22 * (dpi / 96) + idx * (chipH + 2);
        ctx.fillStyle = event.color;
        ctx.fillRect(cx + 4, ey, cellW - 8, chipH);
        if (grid.showEventTitles) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "500 " + 6.5 * (dpi / 72) + "px Outfit, system-ui, sans-serif";
          ctx.fillText(event.title, cx + 7, ey + 1, cellW - 14);
        }
      });
      if (events.length > 3) {
        ctx.fillStyle = grid.numberColor;
        ctx.font = "500 " + 6.5 * (dpi / 72) + "px Outfit, system-ui, sans-serif";
        ctx.fillText("+" + (events.length - 3) + " more", cx + 6, cy + 22 * (dpi / 96) + 3 * (chipH + 2));
      }
    }
  }
}
