import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

const ZODIAC_SIGNS = [
  { name: "Capricorn", symbol: "♑", start: [12, 22], end: [1, 19] },
  { name: "Aquarius", symbol: "♒", start: [1, 20], end: [2, 18] },
  { name: "Pisces", symbol: "♓", start: [2, 19], end: [3, 20] },
  { name: "Aries", symbol: "♈", start: [3, 21], end: [4, 19] },
  { name: "Taurus", symbol: "♉", start: [4, 20], end: [5, 20] },
  { name: "Gemini", symbol: "♊", start: [5, 21], end: [6, 20] },
  { name: "Cancer", symbol: "♋", start: [6, 21], end: [7, 22] },
  { name: "Leo", symbol: "♌", start: [7, 23], end: [8, 22] },
  { name: "Virgo", symbol: "♍", start: [8, 23], end: [9, 22] },
  { name: "Libra", symbol: "♎", start: [9, 23], end: [10, 22] },
  { name: "Scorpio", symbol: "♏", start: [10, 23], end: [11, 21] },
  { name: "Sagittarius", symbol: "♐", start: [11, 22], end: [12, 21] },
];

const INSIGHT_POOL = [
  "A surprise conversation could open a door you didn't expect.",
  "Your intuition is sharp today — trust your first instinct.",
  "Small acts of kindness will come back to you twofold.",
  "Focus on one priority and you'll make real progress.",
  "A creative idea deserves your attention this afternoon.",
  "Balance rest with ambition — pacing wins the day.",
  "Someone admires your resilience more than you realize.",
  "A financial or practical matter resolves smoother than feared.",
  "Travel or learning plans gain fresh momentum.",
  "Romance and friendship both benefit from honest words.",
  "Declutter one corner of your life — clarity follows.",
  "Your patience with others strengthens an important bond.",
  "An old hobby resurfaces with new meaning.",
  "Say yes to something slightly outside your comfort zone.",
  "Evening hours favor reflection and planning ahead.",
];

const MOOD_POOL = [
  "Cosmic energy favors bold moves today.",
  "The stars encourage patience and steady progress.",
  "A day of pleasant surprises awaits you.",
  "Clarity arrives when you slow down and listen.",
  "Luck leans your way — stay open to it.",
  "Harmony between work and rest is within reach.",
];

const SIGN_COLORS = {
  Aries: "#FF6B6B",
  Taurus: "#6BCB77",
  Gemini: "#FFD93D",
  Cancer: "#6C9BCF",
  Leo: "#FF9F43",
  Virgo: "#95E1D3",
  Libra: "#DDA0DD",
  Scorpio: "#8E44AD",
  Sagittarius: "#9B59B6",
  Capricorn: "#5D6D7E",
  Aquarius: "#48C9B0",
  Pisces: "#7FB3D5",
};

export const showHoroscopeInputSchema = {
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("User's date of birth in YYYY-MM-DD format"),
};

export const showHoroscopeOutputSchema = {
  dob: z.string(),
  sign: z.string(),
  symbol: z.string(),
  mood: z.string(),
  points: z.array(z.string()),
  accentColor: z.string(),
};

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isInRange(month, day, start, end) {
  const [startMonth, startDay] = start;
  const [endMonth, endDay] = end;

  if (startMonth === endMonth) {
    return month === startMonth && day >= startDay && day <= endDay;
  }

  if (startMonth > endMonth) {
    return (
      (month === startMonth && day >= startDay) ||
      (month === endMonth && day <= endDay)
    );
  }

  return (
    (month > startMonth || (month === startMonth && day >= startDay)) &&
    (month < endMonth || (month === endMonth && day <= endDay))
  );
}

function getZodiacSign(month, day) {
  return (
    ZODIAC_SIGNS.find((sign) => isInRange(month, day, sign.start, sign.end)) ??
    ZODIAC_SIGNS[0]
  );
}

function pickFromPool(pool, seed, count) {
  const picks = [];
  const used = new Set();

  for (let i = 0; i < count; i++) {
    let index = (seed + i * 7) % pool.length;
    while (used.has(index)) {
      index = (index + 1) % pool.length;
    }
    used.add(index);
    picks.push(pool[index]);
  }

  return picks;
}

function generateHoroscope(dob) {
  const [, monthStr, dayStr] = dob.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  const sign = getZodiacSign(month, day);
  const seed = hashString(dob + sign.name);

  const points = pickFromPool(INSIGHT_POOL, seed, 3);
  const mood = MOOD_POOL[seed % MOOD_POOL.length];
  const accentColor = SIGN_COLORS[sign.name] ?? "#7C5CFC";

  return {
    dob,
    sign: sign.name,
    symbol: sign.symbol,
    mood,
    points,
    accentColor,
  };
}

const MOCK_API_DELAY_MS = 1800;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleShowHoroscope(args) {
  const dob = args?.dob?.trim?.() ?? "";
  if (!dob) {
    return {
      content: [
        {
          type: "text",
          text: "Please share your date of birth (YYYY-MM-DD) so I can read your horoscope.",
        },
      ],
    };
  }

  const parsed = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return {
      content: [
        {
          type: "text",
          text: "That date doesn't look valid. Please use YYYY-MM-DD format.",
        },
      ],
    };
  }

  await delay(MOCK_API_DELAY_MS);

  const horoscope = generateHoroscope(dob);

  return {
    content: [
      {
        type: "text",
        text: `${horoscope.symbol} ${horoscope.sign}: ${horoscope.mood}`,
      },
    ],
    structuredContent: horoscope,
  };
}

export function registerShowHoroscopeTool(server, { widgetUri, widgetCsp }) {
  registerAppTool(
    server,
    "show_horoscope",
    {
      title: "Show horoscope",
      description:
        "Displays a personalized horoscope card based on the user's date of birth. " +
        "When the user asks for their horoscope, first ask for their date of birth (YYYY-MM-DD), " +
        "then call this tool with their DOB.",
      inputSchema: showHoroscopeInputSchema,
      outputSchema: showHoroscopeOutputSchema,
      _meta: {
        ui: {
          resourceUri: widgetUri,
          csp: widgetCsp,
        },
      },
    },
    handleShowHoroscope
  );
}
