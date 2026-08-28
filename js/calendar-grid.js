class CalendarGrid {
  constructor(root, options) {
    this.root = root;
    this.options = options;
  }

  render(year, month, weekStartsOn, eventsByDay, grid, interactive, selectedDay) {
    const names = weekStartsOn === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN;
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() - weekStartsOn + 7) % 7;
    const days = Utils.daysInMonth(year, month);
    const todayIso = Utils.isoDate(new Date());
    const title = Utils.monthName(month, year) + " " + year;

    const titleEl = Utils.el("div", {
      class: "calendar-title" + (grid.showTitle ? "" : " is-hidden"),
      text: title,
      style: { color: grid.titleColor },
    });

    const dow = Utils.el("div", { class: "dow-row" });
    names.forEach((name) => {
      dow.appendChild(
        Utils.el("div", {
          class: "dow-cell",
          text: name,
          style: { color: grid.labelColor },
        })
      );
    });

    const gridEl = Utils.el("div", {
      class: "day-grid",
      style: { color: grid.lineColor },
    });

    const totalCells = 42;
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startPad + 1;
      const cell = Utils.el("div", { class: "day-cell" });
      if (dayNum < 1 || dayNum > days) {
        cell.classList.add("is-empty");
        gridEl.appendChild(cell);
        continue;
      }
      const iso = year + "-" + Utils.pad(month + 1) + "-" + Utils.pad(dayNum);
      const date = new Date(year, month, dayNum);
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      if (weekend) cell.classList.add("is-weekend");
      if (interactive && iso === todayIso) cell.classList.add("is-today");
      if (iso === selectedDay) cell.style.background = "rgba(224, 120, 61, 0.08)";
      cell.dataset.date = iso;
      const num = Utils.el("div", {
        class: "day-num",
        text: String(dayNum),
        style: { color: weekend ? grid.weekendColor : grid.numberColor },
      });
      cell.appendChild(num);
      const events = eventsByDay[iso] || [];
      if (grid.showEventTitles) {
        const visible = events.slice(0, 3);
        visible.forEach((event) => {
          cell.appendChild(
            Utils.el("div", {
              class: "event-chip",
              text: event.title,
              style: { background: event.color },
              title: event.title,
            })
          );
        });
        if (events.length > 3) {
          cell.appendChild(
            Utils.el("div", {
              class: "event-more",
              text: "+" + (events.length - 3) + " more",
              style: { color: grid.numberColor },
            })
          );
        }
      } else {
        events.slice(0, 4).forEach((event) => {
          cell.appendChild(
            Utils.el("div", {
              class: "event-chip",
              style: { background: event.color, height: "5px", padding: 0 },
              title: event.title,
            })
          );
        });
      }
      if (interactive) {
        cell.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (this.options.onDayClick) this.options.onDayClick(iso);
        });
        cell.addEventListener("dblclick", (ev) => {
          ev.stopPropagation();
          if (this.options.onDayCreate) this.options.onDayCreate(iso);
        });
      }
      gridEl.appendChild(cell);
    }

    this.root.innerHTML = "";
    this.root.appendChild(titleEl);
    this.root.appendChild(dow);
    this.root.appendChild(gridEl);
  }
}
