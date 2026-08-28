class EventStore {
  constructor(state) {
    this.state = state;
    this.parser = new IcsParser();
  }

  all() {
    return this.state.data.events;
  }

  add(event) {
    const next = this.normalizeInput(event);
    next.id = next.id || Utils.uid();
    this.state.data.events.push(next);
    this.state.emit();
    return next;
  }

  update(id, patch) {
    const event = this.state.data.events.find((item) => item.id === id);
    if (!event) return null;
    Object.assign(event, this.normalizeInput(Object.assign({}, event, patch)));
    event.id = id;
    this.state.emit();
    return event;
  }

  remove(id) {
    this.state.data.events = this.state.data.events.filter((item) => item.id !== id);
    this.state.emit();
  }

  get(id) {
    return this.state.data.events.find((item) => item.id === id) || null;
  }

  forDate(iso) {
    return this.all()
      .filter((event) => iso >= event.start && iso <= event.end)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  forMonth(year, month) {
    const start = year + "-" + Utils.pad(month + 1) + "-01";
    const end = year + "-" + Utils.pad(month + 1) + "-" + Utils.pad(Utils.daysInMonth(year, month));
    return this.all()
      .filter((event) => event.start <= end && event.end >= start)
      .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  }

  groupedByDay(year, month) {
    const map = {};
    this.forMonth(year, month).forEach((event) => {
      const from = event.start < year + "-" + Utils.pad(month + 1) + "-01"
        ? year + "-" + Utils.pad(month + 1) + "-01"
        : event.start;
      const last = event.end > year + "-" + Utils.pad(month + 1) + "-" + Utils.pad(Utils.daysInMonth(year, month))
        ? year + "-" + Utils.pad(month + 1) + "-" + Utils.pad(Utils.daysInMonth(year, month))
        : event.end;
      Utils.eachDate(from, last, (iso) => {
        if (!map[iso]) map[iso] = [];
        map[iso].push(event);
      });
    });
    return map;
  }

  normalizeInput(event) {
    const start = event.start;
    let end = event.end || event.start;
    if (end < start) end = start;
    return {
      id: event.id,
      title: (event.title || "Untitled event").trim(),
      start: start,
      end: end,
      allDay: event.allDay !== false,
      description: event.description || "",
      color: event.color || EVENT_COLORS[0],
      source: event.source || "manual",
    };
  }

  importIcsText(text, year) {
    const parsed = this.parser.parse(text);
    const rangeStart = new Date(year - 1, 11, 1);
    const rangeEnd = new Date(year + 1, 0, 31);
    const existing = new Set(this.all().map((event) => event.start + "|" + event.title));
    let added = 0;
    parsed.forEach((raw) => {
      const instances = this.parser.expand(raw, rangeStart, rangeEnd);
      instances.forEach((instance) => {
        const startIso = Utils.isoDate(instance.startDate);
        let endIso;
        if (instance.allDay) {
          const exclusive = new Date(instance.endDate.getTime());
          exclusive.setDate(exclusive.getDate() - 1);
          if (exclusive < instance.startDate) exclusive.setTime(instance.startDate.getTime());
          endIso = Utils.isoDate(exclusive);
        } else {
          endIso = Utils.isoDate(instance.endDate);
          if (endIso < startIso) endIso = startIso;
        }
        const key = startIso + "|" + instance.title;
        if (existing.has(key)) return;
        existing.add(key);
        this.state.data.events.push(
          this.normalizeInput({
            id: Utils.uid(),
            title: instance.title,
            description: instance.description,
            start: startIso,
            end: endIso,
            allDay: instance.allDay,
            color: EVENT_COLORS[added % EVENT_COLORS.length],
            source: "ics",
          })
        );
        added += 1;
      });
    });
    if (added) this.state.emit();
    return { parsed: parsed.length, added: added };
  }
}
