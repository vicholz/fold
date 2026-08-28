class IcsParser {
  parse(text) {
    const unfolded = this.unfold(String(text || "").replace(/^\uFEFF/, ""));
    const lines = unfolded.split(/\r?\n/);
    const events = [];
    let current = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (line.toUpperCase() === "BEGIN:VEVENT") {
        current = { fields: {}, extras: [] };
        continue;
      }
      if (line.toUpperCase() === "END:VEVENT") {
        if (current) {
          const normalized = this.normalize(current);
          if (normalized) events.push(normalized);
        }
        current = null;
        continue;
      }
      if (!current) continue;
      const parsed = this.parseLine(line);
      if (!parsed) continue;
      if (!current.fields[parsed.name]) current.fields[parsed.name] = parsed;
      else current.extras.push(parsed);
    }
    return events;
  }

  unfold(text) {
    return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  }

  parseLine(line) {
    const colon = line.indexOf(":");
    if (colon < 0) return null;
    const meta = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const parts = meta.split(";");
    const name = parts[0].toUpperCase();
    const params = {};
    for (let i = 1; i < parts.length; i++) {
      const eq = parts[i].indexOf("=");
      if (eq < 0) params[parts[i].toUpperCase()] = true;
      else params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
    }
    return { name: name, params: params, value: value };
  }

  unescape(value) {
    return String(value || "")
      .replace(/\\n/gi, "\n")
      .replace(/\\,/g, ",")
      .replace(/\\;/g, ";")
      .replace(/\\\\/g, "\\");
  }

  parseDate(field) {
    if (!field) return null;
    const value = field.value.trim();
    const params = field.params || {};
    if (params.VALUE === "DATE" || /^\d{8}$/.test(value)) {
      const y = Number(value.slice(0, 4));
      const m = Number(value.slice(4, 6)) - 1;
      const d = Number(value.slice(6, 8));
      return { date: new Date(y, m, d), allDay: true };
    }
    const y = Number(value.slice(0, 4));
    const mo = Number(value.slice(4, 6)) - 1;
    const d = Number(value.slice(6, 8));
    const h = Number(value.slice(9, 11) || 0);
    const mi = Number(value.slice(11, 13) || 0);
    const s = Number(value.slice(13, 15) || 0);
    const date = value.endsWith("Z")
      ? new Date(Date.UTC(y, mo, d, h, mi, s))
      : new Date(y, mo, d, h, mi, s);
    return { date: date, allDay: false };
  }

  parseRRule(value) {
    const rule = {
      freq: "DAILY",
      interval: 1,
      count: null,
      until: null,
      byday: [],
      bymonthday: [],
    };
    String(value || "")
      .split(";")
      .forEach((part) => {
        const eq = part.indexOf("=");
        if (eq < 0) return;
        const key = part.slice(0, eq).toUpperCase();
        const val = part.slice(eq + 1);
        if (key === "FREQ") rule.freq = val.toUpperCase();
        if (key === "INTERVAL") rule.interval = Number(val) || 1;
        if (key === "COUNT") rule.count = Number(val);
        if (key === "UNTIL") {
          const parsed = this.parseDate({ value: val, params: {} });
          rule.until = parsed ? parsed.date : null;
        }
        if (key === "BYDAY") rule.byday = val.split(",").filter(Boolean);
        if (key === "BYMONTHDAY") {
          rule.bymonthday = val.split(",").map(Number).filter(Boolean);
        }
      });
    return rule;
  }

  weekdayNumber(code) {
    const map = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    return map[code.slice(-2)];
  }

  nthWeekdayOfMonth(year, month, weekday, nth) {
    if (nth > 0) {
      const first = new Date(year, month, 1);
      const delta = (weekday - first.getDay() + 7) % 7;
      const day = 1 + delta + (nth - 1) * 7;
      const date = new Date(year, month, day);
      if (date.getMonth() !== month) return null;
      return date;
    }
    const last = new Date(year, month + 1, 0);
    const delta = (last.getDay() - weekday + 7) % 7;
    const day = last.getDate() - delta + (nth + 1) * 7;
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) return null;
    return date;
  }

  addInterval(date, freq, interval) {
    const next = new Date(date.getTime());
    if (freq === "DAILY") next.setDate(next.getDate() + interval);
    else if (freq === "WEEKLY") next.setDate(next.getDate() + 7 * interval);
    else if (freq === "MONTHLY") next.setMonth(next.getMonth() + interval);
    else if (freq === "YEARLY") next.setFullYear(next.getFullYear() + interval);
    else next.setDate(next.getDate() + interval);
    return next;
  }

  startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  expand(event, rangeStart, rangeEnd) {
    const start = event.startDate;
    if (!event.rrule) {
      if (event.endDate < rangeStart || start > rangeEnd) return [];
      return [event];
    }
    const rule = this.parseRRule(event.rrule);
    const duration = event.endDate.getTime() - start.getTime();
    const dates = [];
    const max = rule.count || 400;
    let guard = 0;
    const startDay = this.startOfDay(start);
    const rangeStartDay = this.startOfDay(rangeStart);
    const rangeEndDay = this.startOfDay(rangeEnd);

    if (rule.freq === "WEEKLY" && rule.byday.length) {
      const weekdays = rule.byday.map((d) => this.weekdayNumber(d)).filter((n) => n != null);
      const cursor = new Date(startDay.getTime());
      while (cursor.getDay() !== startDay.getDay() && guard < 8) {
        cursor.setDate(cursor.getDate() - 1);
        guard += 1;
      }
      let count = 0;
      guard = 0;
      while (cursor <= rangeEndDay && count < max && guard < 5000) {
        guard += 1;
        if (rule.until && cursor > rule.until) break;
        for (let i = 0; i < 7; i++) {
          const day = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
          if (day < startDay) continue;
          if (day > rangeEndDay) break;
          if (rule.until && this.startOfDay(day) > this.startOfDay(rule.until)) break;
          if (weekdays.indexOf(day.getDay()) === -1) continue;
          if (this.isExcluded(event.exdates, day)) continue;
          if (day >= rangeStartDay) {
            dates.push(this.occurrence(event, day, duration));
            count += 1;
            if (count >= max) break;
          }
        }
        cursor.setDate(cursor.getDate() + 7 * rule.interval);
      }
      return dates;
    }

    if (rule.freq === "MONTHLY" && rule.byday.length) {
      const token = rule.byday[0];
      const wd = this.weekdayNumber(token);
      const nth = parseInt(token, 10) || 1;
      let year = start.getFullYear();
      let month = start.getMonth();
      let count = 0;
      while (count < max && guard < 400) {
        guard += 1;
        const date = this.nthWeekdayOfMonth(year, month, wd, nth);
        month += rule.interval;
        if (month > 11) {
          year += Math.floor(month / 12);
          month = month % 12;
        }
        if (!date) continue;
        if (date < startDay) continue;
        if (rule.until && date > rule.until) break;
        if (date > rangeEndDay) break;
        if (this.isExcluded(event.exdates, date)) continue;
        if (date >= rangeStartDay) {
          dates.push(this.occurrence(event, date, duration));
          count += 1;
        }
      }
      return dates;
    }

    let current = new Date(start.getTime());
    let count = 0;
    while (current <= rangeEnd && count < max && guard < 4000) {
      guard += 1;
      if (rule.until && current > rule.until) break;
      if (!this.isExcluded(event.exdates, current) && current >= rangeStart && current >= start) {
        if (!rule.bymonthday.length || rule.bymonthday.indexOf(current.getDate()) !== -1) {
          dates.push(this.occurrence(event, current, duration));
          count += 1;
        }
      }
      current = this.addInterval(current, rule.freq, rule.interval);
    }
    return dates;
  }

  occurrence(event, startDate, duration) {
    const endDate = new Date(startDate.getTime() + (duration || 0));
    return {
      title: event.title,
      description: event.description,
      allDay: event.allDay,
      startDate: new Date(startDate.getTime()),
      endDate: endDate,
      source: "ics",
    };
  }

  isExcluded(exdates, date) {
    if (!exdates || !exdates.length) return false;
    const iso = Utils.isoDate(date);
    return exdates.indexOf(iso) !== -1;
  }

  collectExdates(current) {
    const list = [];
    const push = (field) => {
      if (!field) return;
      String(field.value)
        .split(",")
        .forEach((chunk) => {
          const parsed = this.parseDate({ value: chunk.trim(), params: field.params || {} });
          if (parsed) list.push(Utils.isoDate(parsed.date));
        });
    };
    push(current.fields.EXDATE);
    current.extras.forEach((field) => {
      if (field.name === "EXDATE") push(field);
    });
    return list;
  }

  normalize(current) {
    const startField = current.fields.DTSTART;
    if (!startField) return null;
    const start = this.parseDate(startField);
    if (!start) return null;
    const endField = current.fields.DTEND;
    let end = endField ? this.parseDate(endField) : null;
    if (!end) {
      const endDate = new Date(start.date.getTime());
      if (start.allDay) endDate.setDate(endDate.getDate() + 1);
      end = { date: endDate, allDay: start.allDay };
    }
    return {
      title: this.unescape((current.fields.SUMMARY && current.fields.SUMMARY.value) || "Untitled event"),
      description: this.unescape((current.fields.DESCRIPTION && current.fields.DESCRIPTION.value) || ""),
      allDay: start.allDay,
      startDate: start.date,
      endDate: end.date,
      rrule: current.fields.RRULE ? current.fields.RRULE.value : null,
      exdates: this.collectExdates(current),
    };
  }
}
