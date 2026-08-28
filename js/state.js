class AppState {
  constructor(year) {
    this.data = defaultProject(year);
    this.listeners = new Set();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach((fn) => fn(this.data));
  }

  monthIndex() {
    return this.data.currentMonth;
  }

  month() {
    return this.data.months[this.data.currentMonth];
  }

  overlay(target) {
    const month = this.month();
    return target === "bottom" ? month.bottomOverlay : month.topOverlay;
  }

  setYear(year) {
    this.data.year = year;
    this.emit();
  }

  setMonth(index) {
    this.data.currentMonth = Utils.clamp(index, 0, 11);
    this.emit();
  }

  setPageSize(id) {
    this.data.pageSize = id;
    this.emit();
  }

  setWeekStart(day) {
    this.data.weekStartsOn = day;
    this.emit();
  }

  updateMonth(partial) {
    const current = this.month();
    Object.keys(partial).forEach((key) => {
      const value = partial[key];
      if (value && typeof value === "object" && !Array.isArray(value) && current[key] && typeof current[key] === "object") {
        Object.assign(current[key], value);
      } else {
        current[key] = value;
      }
    });
    this.emit();
  }

  updateImage(which, partial) {
    const month = this.month();
    Object.assign(month[which], partial);
    this.emit();
  }

  updateOverlay(target, partial) {
    Object.assign(this.overlay(target), partial);
    this.emit();
  }

  addText(target) {
    const box = defaultTextBox();
    this.overlay(target).texts.push(box);
    this.emit();
    return box;
  }

  updateText(target, id, partial) {
    const box = this.overlay(target).texts.find((t) => t.id === id);
    if (!box) return;
    Object.assign(box, partial);
    this.emit();
  }

  removeText(target, id) {
    const overlay = this.overlay(target);
    overlay.texts = overlay.texts.filter((t) => t.id !== id);
    this.emit();
  }

  replace(data) {
    const next = defaultProject(new Date().getFullYear());
    Object.assign(next, data);
    if (!Array.isArray(next.months) || next.months.length !== 12) {
      next.months = defaultProject(next.year).months;
    } else {
      next.months = next.months.map((month) => {
        const base = defaultMonthState();
        return {
          photo: Object.assign(base.photo, month.photo || {}),
          calendarBg: Object.assign(base.calendarBg, month.calendarBg || {}),
          topOverlay: mergeOverlay(month.topOverlay),
          bottomOverlay: mergeOverlay(month.bottomOverlay),
          grid: Object.assign(base.grid, month.grid || {}),
        };
      });
    }
    if (!Array.isArray(next.events)) next.events = [];
    this.data = next;
    this.emit();
  }

  toJSON() {
    return Utils.deepClone(this.data);
  }
}

class ProjectStore {
  constructor() {
    this.dbName = "fold-calendar";
    this.storeName = "project";
  }

  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore("project");
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  async save(data) {
    try {
      const db = await this.open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readwrite");
        tx.objectStore(this.storeName).put(data, "current");
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      console.warn("Autosave skipped", err);
    }
  }

  async load() {
    try {
      const db = await this.open();
      const data = await new Promise((resolve, reject) => {
        const tx = db.transaction(this.storeName, "readonly");
        const req = tx.objectStore(this.storeName).get("current");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return data;
    } catch (err) {
      return null;
    }
  }
}
