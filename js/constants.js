const PAGE_SIZES = {
  letter: {
    id: "letter",
    label: "Letter",
    detail: "8.5 × 11 in",
    widthIn: 8.5,
    heightIn: 11,
    widthPt: 612,
    heightPt: 792,
    cssPage: "letter portrait",
    cssWidth: "8.5in",
    cssHeight: "11in",
  },
  tabloid: {
    id: "tabloid",
    label: "Tabloid",
    detail: "11 × 17 in",
    widthIn: 11,
    heightIn: 17,
    widthPt: 792,
    heightPt: 1224,
    cssPage: "11in 17in",
    cssWidth: "11in",
    cssHeight: "17in",
  },
  a3: {
    id: "a3",
    label: "A3",
    detail: "297 × 420 mm",
    widthIn: 297 / 25.4,
    heightIn: 420 / 25.4,
    widthPt: 841.89,
    heightPt: 1190.55,
    cssPage: "A3 portrait",
    cssWidth: "297mm",
    cssHeight: "420mm",
  },
};

const TEXT_FONTS = [
  { name: "Fraunces", value: "Fraunces, Georgia, serif" },
  { name: "Outfit", value: "Outfit, system-ui, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Palatino", value: '"Palatino Linotype", Palatino, serif' },
  { name: "Times", value: '"Times New Roman", Times, serif' },
  { name: "Arial", value: "Arial, Helvetica, sans-serif" },
  { name: "Trebuchet", value: '"Trebuchet MS", sans-serif' },
  { name: "Courier", value: '"Courier New", Courier, monospace' },
  { name: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
];

const EVENT_COLORS = [
  "#c45f28",
  "#3d6b8a",
  "#5d7a45",
  "#8b4b6b",
  "#b0892c",
  "#4a5563",
  "#6b4c9a",
  "#9a3b2f",
];

const WEEKDAYS_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function defaultImageLayer() {
  return {
    src: null,
    originalSrc: null,
    scale: 1,
    x: 0,
    y: 0,
    opacity: 1,
  };
}

function defaultOverlay() {
  return {
    enabled: false,
    color: "#1a1410",
    colorOpacity: 0.35,
    image: null,
    imageOpacity: 0.5,
    texts: [],
  };
}

function defaultGridStyle() {
  return {
    showTitle: true,
    titleColor: "#2c261f",
    numberColor: "#2c261f",
    weekendColor: "#8b4b32",
    lineColor: "#c4b8a8",
    labelColor: "#6b6156",
    showEventTitles: true,
  };
}

function defaultMonthState() {
  return {
    photo: defaultImageLayer(),
    calendarBg: defaultImageLayer(),
    topOverlay: defaultOverlay(),
    bottomOverlay: defaultOverlay(),
    grid: defaultGridStyle(),
  };
}

function defaultProject(year) {
  return {
    version: 1,
    year: year,
    currentMonth: 0,
    weekStartsOn: 0,
    pageSize: "tabloid",
    showHangingHole: true,
    printHoleGuide: false,
    months: Array.from({ length: 12 }, () => defaultMonthState()),
    events: [],
  };
}

function defaultTextBox() {
  return {
    id: Utils.uid(),
    x: 10,
    y: 12,
    w: 80,
    content: "Double-click to edit",
    fontFamily: "Fraunces, Georgia, serif",
    fontSize: 28,
    color: "#ffffff",
    bold: true,
    italic: false,
    underline: false,
    align: "center",
    opacity: 1,
    letterSpacing: 0,
    bgColor: "#1a1410",
    bgColorOpacity: 0,
    bgImage: null,
    bgImageOpacity: 1,
  };
}

function mergeOverlay(saved) {
  const base = defaultOverlay();
  const merged = Object.assign(base, saved || {});
  merged.texts = (merged.texts || []).map(function (box) {
    return Object.assign(defaultTextBox(), box);
  });
  return merged;
}
