const Astro = (() => {
  const D2R = Math.PI / 180,
    R2D = 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;
  const sind = (a) => Math.sin(a * D2R),
    cosd = (a) => Math.cos(a * D2R),
    tand = (a) => Math.tan(a * D2R);
  const dAng = (a, b) => ((b - a + 540) % 360) - 180; // signed shortest a→b

  const SIGN_NAMES = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
  ];
  const SIGN_GLYPHS = [
    "\u2648\uFE0E",
    "\u2649\uFE0E",
    "\u264A\uFE0E",
    "\u264B\uFE0E",
    "\u264C\uFE0E",
    "\u264D\uFE0E",
    "\u264E\uFE0E",
    "\u264F\uFE0E",
    "\u2650\uFE0E",
    "\u2651\uFE0E",
    "\u2652\uFE0E",
    "\u2653\uFE0E",
  ];

  function deltaT(y) {
    if (y > 1945 && y < 2060) {
      const t = y - 2000;
      return 62.92 + 0.32217 * t + 0.005589 * t * t;
    }
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }

  // ---- Keplerian elements, J2000 + rates/century (Standish) ----
  const EL = {
    Mercury: [
      [
        0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628,
        48.33076593,
      ],
      [
        0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689,
        -0.12534081,
      ],
    ],
    Venus: [
      [
        0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718,
        76.67984255,
      ],
      [
        0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329,
        -0.27769418,
      ],
    ],
    Earth: [
      [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
      [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    ],
    Mars: [
      [
        1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959,
        49.55953891,
      ],
      [
        0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088,
        -0.29257343,
      ],
    ],
    Jupiter: [
      [
        5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983,
        100.47390909,
      ],
      [
        -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668,
        0.20469106,
      ],
    ],
    Saturn: [
      [
        9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831,
        113.66242448,
      ],
      [
        -0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216,
        -0.28867794,
      ],
    ],
    Uranus: [
      [
        19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763,
        74.01692503,
      ],
      [
        -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281,
        0.04240589,
      ],
    ],
    Neptune: [
      [
        30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227,
        131.78422574,
      ],
      [
        0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464,
        -0.00508664,
      ],
    ],
    Pluto: [
      [
        39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629,
        110.30393684,
      ],
      [
        -0.00031596, 0.0000517, 0.00004818, 145.20780515, -0.04062942,
        -0.01183482,
      ],
    ],
  };

  function helio(name, T) {
    const [e0, r] = EL[name];
    const a = e0[0] + r[0] * T,
      e = e0[1] + r[1] * T,
      I = e0[2] + r[2] * T;
    const L = e0[3] + r[3] * T,
      wbar = e0[4] + r[4] * T,
      O = e0[5] + r[5] * T;
    const w = wbar - O;
    let M = norm(L - wbar);
    if (M > 180) M -= 360;
    let E = M + R2D * e * sind(M);
    for (let i = 0; i < 10; i++) {
      const dM = M - (E - R2D * e * sind(E));
      E += dM / (1 - e * cosd(E));
    }
    const xp = a * (cosd(E) - e),
      yp = a * Math.sqrt(1 - e * e) * sind(E);
    const cw = cosd(w),
      sw = sind(w),
      cO = cosd(O),
      sO = sind(O),
      ci = cosd(I),
      si = sind(I);
    return [
      (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
      (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
      sw * si * xp + cw * si * yp,
    ];
  }

  // ---- Moon (Meeus ch. 47, main terms; coeffs 1e-6 deg) ----
  const LT = [
    [0, 0, 1, 0, 6288774],
    [2, 0, -1, 0, 1274027],
    [2, 0, 0, 0, 658314],
    [0, 0, 2, 0, 213618],
    [0, 1, 0, 0, -185116],
    [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793],
    [2, -1, -1, 0, 57066],
    [2, 0, 1, 0, 53322],
    [2, -1, 0, 0, 45758],
    [0, 1, -1, 0, -40923],
    [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383],
    [2, 0, 0, -2, 15327],
    [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980],
    [4, 0, -1, 0, 10675],
    [0, 0, 3, 0, 10034],
    [4, 0, -2, 0, 8548],
    [2, 1, -1, 0, -7888],
    [2, 1, 0, 0, -6766],
    [1, 0, -1, 0, -5163],
    [1, 1, 0, 0, 4987],
    [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994],
    [4, 0, 0, 0, 3861],
    [2, 0, -3, 0, 3665],
    [0, 1, -2, 0, -2689],
    [2, 0, -1, 2, -2602],
    [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348],
    [2, -2, 0, 0, 2236],
    [0, 1, 2, 0, -2120],
    [0, 2, 0, 0, -2069],
    [2, -2, -1, 0, 2048],
    [2, 0, 1, -2, -1773],
    [2, 0, 0, 2, -1595],
    [4, -1, -1, 0, 1215],
    [0, 0, 2, 2, -1110],
    [3, 0, -1, 0, -892],
    [2, 1, 1, 0, -810],
    [4, -1, -2, 0, 759],
    [0, 2, -1, 0, -713],
    [2, 2, -1, 0, -700],
    [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596],
    [4, 0, 1, 0, 549],
    [0, 0, 4, 0, 537],
    [4, -1, 0, 0, 520],
    [1, 0, -2, 0, -487],
    [2, 1, 0, -2, -399],
    [0, 0, 2, -2, -381],
    [1, 1, 1, 0, 351],
    [3, 0, -2, 0, -340],
    [4, 0, -3, 0, 330],
    [2, -1, 2, 0, 327],
    [0, 2, 1, 0, -323],
    [1, 1, -1, 0, 299],
    [2, 0, 3, 0, 294],
  ];

  function moonLon(T) {
    const Lp = norm(
      218.3164477 +
        481267.88123421 * T -
        0.0015786 * T * T +
        (T * T * T) / 538841 -
        (T * T * T * T) / 65194000,
    );
    const D = norm(
      297.8501921 +
        445267.1114034 * T -
        0.0018819 * T * T +
        (T * T * T) / 545868 -
        (T * T * T * T) / 113065000,
    );
    const M = norm(
      357.5291092 +
        35999.0502909 * T -
        0.0001536 * T * T +
        (T * T * T) / 24490000,
    );
    const Mp = norm(
      134.9633964 +
        477198.8675055 * T +
        0.0087414 * T * T +
        (T * T * T) / 69699 -
        (T * T * T * T) / 14712000,
    );
    const F = norm(
      93.272095 +
        483202.0175233 * T -
        0.0036539 * T * T -
        (T * T * T) / 3526000 +
        (T * T * T * T) / 863310000,
    );
    const A1 = norm(119.75 + 131.849 * T),
      A2 = norm(53.09 + 479264.29 * T);
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    let s = 0;
    for (const [d, m, mp, f, c] of LT) {
      let cc = c;
      if (m === 1 || m === -1) cc *= E;
      else if (m === 2 || m === -2) cc *= E * E;
      s += cc * sind(d * D + m * M + mp * Mp + f * F);
    }
    s += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);
    return norm(Lp + s / 1e6);
  }

  // ---- Houses ----
  function raToLon(RA, eps) {
    return norm(Math.atan2(sind(RA), cosd(RA) * cosd(eps)) * R2D);
  }

  function placidusCusp(ramc, lat, eps, offset, f, noct) {
    let RA = norm(ramc + offset);
    for (let i = 0; i < 20; i++) {
      const lam = raToLon(RA, eps);
      const dec = Math.asin(sind(eps) * sind(lam)) * R2D;
      const x = tand(lat) * tand(dec);
      if (Math.abs(x) >= 1) return null;
      const AD = Math.asin(x) * R2D;
      RA = noct ? norm(ramc + 180 - f * (90 - AD)) : norm(ramc + f * (90 + AD));
    }
    return raToLon(RA, eps);
  }

  function computeCusps(system, ramc, lat, eps, asc, mc) {
    const c = new Array(12);
    if (system === "Whole Sign") {
      const s = Math.floor(asc / 30) * 30;
      for (let i = 0; i < 12; i++) c[i] = norm(s + i * 30);
      return c;
    }
    if (system === "Equal") {
      for (let i = 0; i < 12; i++) c[i] = norm(asc + i * 30);
      return c;
    }
    if (system === "Placidus") {
      const c11 = placidusCusp(ramc, lat, eps, 30, 1 / 3, false);
      const c12 = placidusCusp(ramc, lat, eps, 60, 2 / 3, false);
      const c2 = placidusCusp(ramc, lat, eps, 120, 2 / 3, true);
      const c3 = placidusCusp(ramc, lat, eps, 150, 1 / 3, true);
      if (c11 != null && c12 != null && c2 != null && c3 != null) {
        c[0] = asc;
        c[1] = c2;
        c[2] = c3;
        c[3] = norm(mc + 180);
        c[4] = norm(c11 + 180);
        c[5] = norm(c12 + 180);
        c[6] = norm(asc + 180);
        c[7] = norm(c2 + 180);
        c[8] = norm(c3 + 180);
        c[9] = mc;
        c[10] = c11;
        c[11] = c12;
        return c;
      } // fall through to Porphyry at extreme latitudes
    }
    const ic = norm(mc + 180);
    const d1 = norm(ic - asc),
      d2 = norm(asc - mc);
    c[0] = asc;
    c[1] = norm(asc + d1 / 3);
    c[2] = norm(asc + (2 * d1) / 3);
    c[3] = ic;
    c[9] = mc;
    c[10] = norm(mc + d2 / 3);
    c[11] = norm(mc + (2 * d2) / 3);
    for (let i = 4; i < 9; i++) c[i] = norm(c[i - 4 + (i < 6 ? 6 : -2)] + 0); // placeholder, fixed below
    c[4] = norm(c[10] + 180);
    c[5] = norm(c[11] + 180);
    c[6] = norm(asc + 180);
    c[7] = norm(c[1] + 180);
    c[8] = norm(c[2] + 180);
    return c;
  }

  function houseOf(lonP, cusps) {
    for (let i = 0; i < 12; i++) {
      const a = cusps[i],
        b = cusps[(i + 1) % 12];
      const span = (((b - a) % 360) + 360) % 360 || 30;
      const off = (((lonP - a) % 360) + 360) % 360;
      if (off < span) return i + 1;
    }
    return 12;
  }

  // ---- Formatting ----
  const pad2 = (n) => (n < 10 ? "0" : "") + n;
  function fmtDM(x) {
    let d = Math.floor(x),
      m = Math.round((x - d) * 60);
    if (m === 60) {
      d += 1;
      m = 0;
    }
    return d + "\u00B0" + pad2(m) + "\u2032";
  }

  // ---- Chart ----
  const BODIES = [
    ["Sun", "\u2609\uFE0E"],
    ["Moon", "\u263D\uFE0E"],
    ["Mercury", "\u263F\uFE0E"],
    ["Venus", "\u2640\uFE0E"],
    ["Mars", "\u2642\uFE0E"],
    ["Jupiter", "\u2643\uFE0E"],
    ["Saturn", "\u2644\uFE0E"],
    ["Uranus", "\u2645\uFE0E"],
    ["Neptune", "\u2646\uFE0E"],
    ["Pluto", "\u2647\uFE0E"],
    ["Node", "\u260A\uFE0E"],
  ];
  const ASPECTS = [
    ["Conjunction", "\u260C\uFE0E", 0, 8],
    ["Sextile", "\u26B9\uFE0E", 60, 5],
    ["Square", "\u25A1\uFE0E", 90, 7],
    ["Trine", "\u25B3\uFE0E", 120, 7],
    ["Opposition", "\u260D\uFE0E", 180, 8],
    // minor aspects — tight orbs, no luminary bonus
    ["Semisextile", "\u26BA\uFE0E", 30, 2],
    ["Quincunx", "\u26BB\uFE0E", 150, 3],
    ["Quintile", "Q", 72, 2],
    ["Biquintile", "bQ", 144, 2],
  ];
  const MINOR = { Semisextile: 1, Quincunx: 1, Quintile: 1, Biquintile: 1 };

  function bodyLonsRaw(T) {
    const e = helio("Earth", T);
    const out = { Sun: norm(Math.atan2(-e[1], -e[0]) * R2D) };
    for (const name of [
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Pluto",
    ]) {
      let p = helio(name, T);
      let g = [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
      const dist = Math.hypot(g[0], g[1], g[2]);
      p = helio(name, T - (dist * 0.0057755183) / 36525);
      g = [p[0] - e[0], p[1] - e[1], p[2] - e[2]];
      out[name] = norm(Math.atan2(g[1], g[0]) * R2D);
    }
    out.Moon = moonLon(T);
    out.Node = norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T);
    return out;
  }

  function computeChart(utcMs, lat, lon, houseSystem) {
    const jdUT = utcMs / 86400000 + 2440587.5;
    const yr = 1970 + utcMs / 31557600000;
    const jdTT = jdUT + deltaT(yr) / 86400;
    const T = (jdTT - 2451545) / 36525;
    const Tut = (jdUT - 2451545) / 36525;

    const Om = norm(125.04452 - 1934.136261 * T);
    const Ls = norm(280.4665 + 36000.7698 * T);
    const Lm = norm(218.3165 + 481267.8813 * T);
    const dpsi =
      (-17.2 * sind(Om) -
        1.32 * sind(2 * Ls) -
        0.23 * sind(2 * Lm) +
        0.21 * sind(2 * Om)) /
      3600;
    const deps =
      (9.2 * cosd(Om) +
        0.57 * cosd(2 * Ls) +
        0.1 * cosd(2 * Lm) -
        0.09 * cosd(2 * Om)) /
      3600;
    const eps =
      23.43929111 -
      0.013004167 * T -
      1.639e-7 * T * T +
      5.036e-7 * T * T * T +
      deps;
    const prec = 1.396971 * T + 0.0003086 * T * T;

    const app = (name, L) =>
      name === "Moon" || name === "Node"
        ? norm(L[name] + dpsi)
        : norm(L[name] + prec + dpsi - 0.00569);

    const dT2 = 0.25 / 36525;
    const L0 = bodyLonsRaw(T),
      L1 = bodyLonsRaw(T - dT2),
      L2 = bodyLonsRaw(T + dT2);

    const gmst = norm(
      280.46061837 +
        360.98564736629 * (jdUT - 2451545) +
        0.000387933 * Tut * Tut -
        (Tut * Tut * Tut) / 38710000,
    );
    const ramc = norm(gmst + dpsi * cosd(eps) + lon);
    const asc = norm(
      Math.atan2(
        cosd(ramc),
        -(sind(ramc) * cosd(eps) + tand(lat) * sind(eps)),
      ) * R2D,
    );
    const mc = norm(Math.atan2(sind(ramc), cosd(ramc) * cosd(eps)) * R2D);
    const cusps = computeCusps(
      houseSystem || "Placidus",
      ramc,
      lat,
      eps,
      asc,
      mc,
    );

    const planets = BODIES.map(([name, glyph]) => {
      const lo = app(name, L0);
      const speed = dAng(app(name, L1), app(name, L2)) / 0.5;
      const sign = Math.floor(lo / 30);
      const inSign = lo % 30;
      return {
        name,
        glyph,
        lon: lo,
        speed,
        retro: name === "Node" ? false : speed < 0,
        sign,
        signName: SIGN_NAMES[sign],
        signGlyph: SIGN_GLYPHS[sign],
        degLabel: fmtDM(inSign),
        posLabel: fmtDM(inSign) + "\u2009" + SIGN_GLYPHS[sign],
        house: houseOf(lo, cusps),
      };
    });

    const aspects = [];
    for (let i = 0; i < 10; i++)
      for (let j = i + 1; j < 10; j++) {
        const a = planets[i],
          b = planets[j];
        const sep = Math.abs(dAng(a.lon, b.lon));
        const lum =
          a.name === "Sun" ||
          a.name === "Moon" ||
          b.name === "Sun" ||
          b.name === "Moon"
            ? 1.5
            : 0;
        let best = null;
        for (const [type, glyph, angle, orb] of ASPECTS) {
          const d = Math.abs(sep - angle);
          if (d <= orb + (MINOR[type] ? 0 : lum) && (!best || d < best.orb))
            best = { type, glyph, orb: d };
        }
        if (best)
          aspects.push({
            p1: a.name,
            p2: b.name,
            g1: a.glyph,
            g2: b.glyph,
            type: best.type,
            glyph: best.glyph,
            orb: best.orb,
            orbLabel: fmtDM(best.orb),
            lon1: a.lon,
            lon2: b.lon,
          });
      }
    aspects.sort((x, y) => x.orb - y.orb);

    return {
      jdUT,
      asc,
      mc,
      eps,
      cusps,
      planets,
      aspects,
      ascLabel: fmtDM(asc % 30) + "\u2009" + SIGN_GLYPHS[Math.floor(asc / 30)],
      mcLabel: fmtDM(mc % 30) + "\u2009" + SIGN_GLYPHS[Math.floor(mc / 30)],
    };
  }

  // ---- Time zones (browser tzdb via Intl) ----
  function wallParts(tz, utcMs) {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const g = (t) => +p.find((x) => x.type === t).value;
    let h = g("hour");
    if (h === 24) h = 0;
    return {
      y: g("year"),
      mo: g("month"),
      d: g("day"),
      h,
      mi: g("minute"),
      s: g("second"),
    };
  }
  function tzOffsetMin(tz, utcMs) {
    const w = wallParts(tz, utcMs);
    return (Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - utcMs) / 60000;
  }
  function localToUTC(dateStr, timeStr, tz) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    const target = Date.UTC(y, mo - 1, d, h, mi || 0);
    let utc = target - tzOffsetMin(tz, target) * 60000;
    utc = target - tzOffsetMin(tz, utc) * 60000;
    return { utcMs: utc, offsetMin: tzOffsetMin(tz, utc) };
  }
  function offsetLabel(tz, utcMs) {
    const m = tzOffsetMin(tz, utcMs),
      s = m < 0 ? "\u2212" : "+",
      am = Math.abs(m);
    return (
      "UTC" + s + pad2(Math.floor(am / 60)) + ":" + pad2(Math.round(am % 60))
    );
  }
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  function wallClock(tz, utcMs) {
    const w = wallParts(tz, utcMs);
    return {
      date: w.y + "-" + pad2(w.mo) + "-" + pad2(w.d),
      time: pad2(w.h) + ":" + pad2(w.mi),
      pretty:
        w.d +
        " " +
        MONTHS[w.mo - 1] +
        " " +
        w.y +
        ", " +
        pad2(w.h) +
        ":" +
        pad2(w.mi) +
        ":" +
        pad2(w.s),
    };
  }
  function prettyDate(dateStr) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    return d + " " + MONTHS[mo - 1] + " " + y;
  }

  // ---- Cities ----
  const RAW = [
    ["New York, USA", 40.7128, -74.006, "America/New_York"],
    ["Los Angeles, USA", 34.0522, -118.2437, "America/Los_Angeles"],
    ["Chicago, USA", 41.8781, -87.6298, "America/Chicago"],
    ["Houston, USA", 29.7604, -95.3698, "America/Chicago"],
    ["Denver, USA", 39.7392, -104.9903, "America/Denver"],
    ["Phoenix, USA", 33.4484, -112.074, "America/Phoenix"],
    ["Seattle, USA", 47.6062, -122.3321, "America/Los_Angeles"],
    ["San Francisco, USA", 37.7749, -122.4194, "America/Los_Angeles"],
    ["Miami, USA", 25.7617, -80.1918, "America/New_York"],
    ["Boston, USA", 42.3601, -71.0589, "America/New_York"],
    ["Atlanta, USA", 33.749, -84.388, "America/New_York"],
    ["New Orleans, USA", 29.9511, -90.0715, "America/Chicago"],
    ["Honolulu, USA", 21.3069, -157.8583, "Pacific/Honolulu"],
    ["Anchorage, USA", 61.2181, -149.9003, "America/Anchorage"],
    ["Toronto, Canada", 43.6532, -79.3832, "America/Toronto"],
    ["Montreal, Canada", 45.5017, -73.5673, "America/Toronto"],
    ["Vancouver, Canada", 49.2827, -123.1207, "America/Vancouver"],
    ["Mexico City, Mexico", 19.4326, -99.1332, "America/Mexico_City"],
    ["Havana, Cuba", 23.1136, -82.3666, "America/Havana"],
    ["Bogota, Colombia", 4.711, -74.0721, "America/Bogota"],
    ["Lima, Peru", -12.0464, -77.0428, "America/Lima"],
    ["Santiago, Chile", -33.4489, -70.6693, "America/Santiago"],
    [
      "Buenos Aires, Argentina",
      -34.6037,
      -58.3816,
      "America/Argentina/Buenos_Aires",
    ],
    ["Sao Paulo, Brazil", -23.5505, -46.6333, "America/Sao_Paulo"],
    ["Rio de Janeiro, Brazil", -22.9068, -43.1729, "America/Sao_Paulo"],
    ["Reykjavik, Iceland", 64.1466, -21.9426, "Atlantic/Reykjavik"],
    ["Dublin, Ireland", 53.3498, -6.2603, "Europe/Dublin"],
    ["London, UK", 51.5074, -0.1278, "Europe/London"],
    ["Lisbon, Portugal", 38.7223, -9.1393, "Europe/Lisbon"],
    ["Madrid, Spain", 40.4168, -3.7038, "Europe/Madrid"],
    ["Paris, France", 48.8566, 2.3522, "Europe/Paris"],
    ["Amsterdam, Netherlands", 52.3676, 4.9041, "Europe/Amsterdam"],
    ["Brussels, Belgium", 50.8503, 4.3517, "Europe/Brussels"],
    ["Zurich, Switzerland", 47.3769, 8.5417, "Europe/Zurich"],
    ["Rome, Italy", 41.9028, 12.4964, "Europe/Rome"],
    ["Berlin, Germany", 52.52, 13.405, "Europe/Berlin"],
    ["Vienna, Austria", 48.2082, 16.3738, "Europe/Vienna"],
    ["Prague, Czechia", 50.0755, 14.4378, "Europe/Prague"],
    ["Warsaw, Poland", 52.2297, 21.0122, "Europe/Warsaw"],
    ["Budapest, Hungary", 47.4979, 19.0402, "Europe/Budapest"],
    ["Stockholm, Sweden", 59.3293, 18.0686, "Europe/Stockholm"],
    ["Oslo, Norway", 59.9139, 10.7522, "Europe/Oslo"],
    ["Copenhagen, Denmark", 55.6761, 12.5683, "Europe/Copenhagen"],
    ["Helsinki, Finland", 60.1699, 24.9384, "Europe/Helsinki"],
    ["Athens, Greece", 37.9838, 23.7275, "Europe/Athens"],
    ["Sofia, Bulgaria", 42.6977, 23.3219, "Europe/Sofia"],
    ["Plovdiv, Bulgaria", 42.1354, 24.7453, "Europe/Sofia"],
    ["Varna, Bulgaria", 43.2141, 27.9147, "Europe/Sofia"],
    ["Burgas, Bulgaria", 42.5048, 27.4626, "Europe/Sofia"],
    ["Ruse, Bulgaria", 43.8356, 25.9657, "Europe/Sofia"],
    ["Stara Zagora, Bulgaria", 42.4258, 25.6345, "Europe/Sofia"],
    ["Istanbul, Turkiye", 41.0082, 28.9784, "Europe/Istanbul"],
    ["Moscow, Russia", 55.7558, 37.6173, "Europe/Moscow"],
    ["Kyiv, Ukraine", 50.4501, 30.5234, "Europe/Kyiv"],
    ["Cairo, Egypt", 30.0444, 31.2357, "Africa/Cairo"],
    ["Casablanca, Morocco", 33.5731, -7.5898, "Africa/Casablanca"],
    ["Lagos, Nigeria", 6.5244, 3.3792, "Africa/Lagos"],
    ["Nairobi, Kenya", -1.2921, 36.8219, "Africa/Nairobi"],
    ["Johannesburg, South Africa", -26.2041, 28.0473, "Africa/Johannesburg"],
    ["Cape Town, South Africa", -33.9249, 18.4241, "Africa/Johannesburg"],
    ["Tel Aviv, Israel", 32.0853, 34.7818, "Asia/Jerusalem"],
    ["Dubai, UAE", 25.2048, 55.2708, "Asia/Dubai"],
    ["Tehran, Iran", 35.6892, 51.389, "Asia/Tehran"],
    ["Karachi, Pakistan", 24.8607, 67.0011, "Asia/Karachi"],
    ["Mumbai, India", 19.076, 72.8777, "Asia/Kolkata"],
    ["Delhi, India", 28.7041, 77.1025, "Asia/Kolkata"],
    ["Bangalore, India", 12.9716, 77.5946, "Asia/Kolkata"],
    ["Kathmandu, Nepal", 27.7172, 85.324, "Asia/Kathmandu"],
    ["Colombo, Sri Lanka", 6.9271, 79.8612, "Asia/Colombo"],
    ["Dhaka, Bangladesh", 23.8103, 90.4125, "Asia/Dhaka"],
    ["Bangkok, Thailand", 13.7563, 100.5018, "Asia/Bangkok"],
    ["Kuala Lumpur, Malaysia", 3.139, 101.6869, "Asia/Kuala_Lumpur"],
    ["Singapore, Singapore", 1.3521, 103.8198, "Asia/Singapore"],
    ["Jakarta, Indonesia", -6.2088, 106.8456, "Asia/Jakarta"],
    ["Ho Chi Minh City, Vietnam", 10.8231, 106.6297, "Asia/Ho_Chi_Minh"],
    ["Hong Kong, China", 22.3193, 114.1694, "Asia/Hong_Kong"],
    ["Taipei, Taiwan", 25.033, 121.5654, "Asia/Taipei"],
    ["Shanghai, China", 31.2304, 121.4737, "Asia/Shanghai"],
    ["Beijing, China", 39.9042, 116.4074, "Asia/Shanghai"],
    ["Seoul, South Korea", 37.5665, 126.978, "Asia/Seoul"],
    ["Tokyo, Japan", 35.6762, 139.6503, "Asia/Tokyo"],
    ["Manila, Philippines", 14.5995, 120.9842, "Asia/Manila"],
    ["Perth, Australia", -31.9505, 115.8605, "Australia/Perth"],
    ["Adelaide, Australia", -34.9285, 138.6007, "Australia/Adelaide"],
    ["Brisbane, Australia", -27.4698, 153.0251, "Australia/Brisbane"],
    ["Sydney, Australia", -33.8688, 151.2093, "Australia/Sydney"],
    ["Melbourne, Australia", -37.8136, 144.9631, "Australia/Melbourne"],
    ["Auckland, New Zealand", -36.8485, 174.7633, "Pacific/Auckland"],
    ["Wellington, New Zealand", -41.2866, 174.7756, "Pacific/Auckland"],
  ];
  const CITIES = RAW.map(([label, lat, lon, tz]) => ({
    label,
    name: label.split(",")[0],
    lat,
    lon,
    tz,
  }));
  function findCity(q) {
    if (!q) return null;
    const s = q.trim().toLowerCase();
    return (
      CITIES.find((c) => c.label.toLowerCase() === s) ||
      CITIES.find((c) => c.label.toLowerCase().startsWith(s)) ||
      CITIES.find((c) => c.label.toLowerCase().includes(s)) ||
      null
    );
  }

  return {
    SIGN_NAMES,
    SIGN_GLYPHS,
    CITIES,
    findCity,
    localToUTC,
    offsetLabel,
    wallClock,
    prettyDate,
    computeChart,
  };
})();

export const {
  SIGN_NAMES,
  SIGN_GLYPHS,
  CITIES,
  findCity,
  localToUTC,
  offsetLabel,
  wallClock,
  prettyDate,
  computeChart,
} = Astro;
export default Astro;
