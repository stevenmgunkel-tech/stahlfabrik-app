function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getEasterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

export function getFeiertageSG(year: number) {
  const easter = getEasterSunday(year);

  return [
    { datum: `${year}-01-01`, name: "Neujahr" },
    { datum: formatDate(addDays(easter, -2)), name: "Karfreitag" },
    { datum: formatDate(addDays(easter, 1)), name: "Ostermontag" },
    { datum: formatDate(addDays(easter, 39)), name: "Auffahrt" },
    { datum: formatDate(addDays(easter, 50)), name: "Pfingstmontag" },
    { datum: `${year}-08-01`, name: "Nationalfeiertag Schweiz" },
    { datum: `${year}-11-01`, name: "Allerheiligen" },
    { datum: `${year}-12-25`, name: "Weihnachten" },
    { datum: `${year}-12-26`, name: "Stephanstag" },
  ];
}

export function istFeiertagSG(datum: Date) {
  const jahr = datum.getFullYear();
  const iso = formatDate(datum);

  return getFeiertageSG(jahr).some(
    (feiertag) => feiertag.datum === iso
  );
}