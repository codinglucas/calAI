// Renders the synthetic nutrition label dataset into eval/data/labels/, with a
// manifest of the values the app should read from each one. The cases cover
// the label prompt's rules: per-serving vs per-100 g, kJ-only energy,
// "less than 1 g", drinks in ml, and harder photos (tilted, faint, small).
// Run: node eval/labels/generate.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const OUT = new URL("../data/labels/", import.meta.url);
const KJ_PER_KCAL = 4.184;

const round1 = (n) => Math.round(n * 10) / 10;
const grams = (n) => (n < 1 ? "<1g" : `${n}g`);
// What the prompt says to read "<1 g" as.
const readGrams = (n) => (n < 1 ? 0.5 : n);

/** US-style label: one per-serving column. */
const us = (id, name, serving, servingGrams, { kcal, fat, carbs, protein }, look = {}) => ({
  id,
  look,
  title: name,
  servingLine: `Serving size ${serving}`,
  columns: ["Amount per serving"],
  rows: [
    ["Calories", [String(kcal)]],
    ["Total Fat", [grams(fat)]],
    ["Total Carbohydrate", [grams(carbs)]],
    ["Protein", [grams(protein)]],
  ],
  expected: {
    grams: servingGrams,
    kcal,
    protein_g: readGrams(protein),
    carbs_g: readGrams(carbs),
    fat_g: readGrams(fat),
  },
});

/** EU-style label: per 100 g only, energy in kJ and kcal. */
const eu = (id, name, { kcal, fat, carbs, protein }, look = {}) => ({
  id,
  look,
  title: name,
  servingLine: "Nutrition information",
  columns: ["Per 100 g"],
  rows: [
    ["Energy", [`${Math.round(kcal * KJ_PER_KCAL)} kJ / ${kcal} kcal`]],
    ["Fat", [grams(fat)]],
    ["Carbohydrate", [grams(carbs)]],
    ["Protein", [grams(protein)]],
  ],
  expected: {
    grams: 100,
    kcal,
    protein_g: readGrams(protein),
    carbs_g: readGrams(carbs),
    fat_g: readGrams(fat),
  },
});

/** Both columns: the prompt prefers per serving. */
const dual = (id, name, servingGrams, per100, look = {}) => {
  const per = (value) => round1((value * servingGrams) / 100);
  const serving = {
    kcal: Math.round((per100.kcal * servingGrams) / 100),
    fat: per(per100.fat),
    carbs: per(per100.carbs),
    protein: per(per100.protein),
  };
  return {
    id,
    look,
    title: name,
    servingLine: `Serving size ${servingGrams} g`,
    columns: ["Per 100 g", `Per serving (${servingGrams} g)`],
    rows: [
      ["Energy (kcal)", [String(per100.kcal), String(serving.kcal)]],
      ["Fat", [grams(per100.fat), grams(serving.fat)]],
      ["Carbohydrate", [grams(per100.carbs), grams(serving.carbs)]],
      ["Protein", [grams(per100.protein), grams(serving.protein)]],
    ],
    expected: {
      grams: servingGrams,
      kcal: serving.kcal,
      protein_g: readGrams(serving.protein),
      carbs_g: readGrams(serving.carbs),
      fat_g: readGrams(serving.fat),
    },
  };
};

/** Energy only in kJ: the prompt says to divide by 4.184. */
const kjOnly = (id, name, { kj, fat, carbs, protein }, look = {}) => ({
  id,
  look,
  title: name,
  servingLine: "Typical values",
  columns: ["Per 100 g"],
  rows: [
    ["Energy", [`${kj} kJ`]],
    ["Fat", [grams(fat)]],
    ["Carbohydrate", [grams(carbs)]],
    ["Protein", [grams(protein)]],
  ],
  expected: {
    grams: 100,
    kcal: round1(kj / KJ_PER_KCAL),
    protein_g: readGrams(protein),
    carbs_g: readGrams(carbs),
    fat_g: readGrams(fat),
  },
});

const CASES = [
  us("us-granola", "Oat Crunch Granola", "2/3 cup (55g)", 55, {
    kcal: 240,
    fat: 9,
    carbs: 34,
    protein: 6,
  }),
  us("us-yogurt", "Plain Greek Yogurt", "1 container (170g)", 170, {
    kcal: 100,
    fat: 0.5,
    carbs: 6,
    protein: 18,
  }),
  us("us-chips", "Sea Salt Potato Chips", "1 oz (28g)", 28, {
    kcal: 160,
    fat: 10,
    carbs: 15,
    protein: 2,
  }),
  us("us-peanut-butter", "Creamy Peanut Butter", "2 tbsp (32g)", 32, {
    kcal: 190,
    fat: 16,
    carbs: 7,
    protein: 7,
  }),
  us("us-soda", "Cola", "1 can (355 mL)", 355, { kcal: 140, fat: 0.5, carbs: 39, protein: 0.5 }),
  us("us-oatmeal-bar", "Chewy Oat Bar", "1 bar (40g)", 40, {
    kcal: 170,
    fat: 6,
    carbs: 26,
    protein: 3,
  }),
  us("us-pasta", "Spaghetti", "2 oz dry (56g)", 56, { kcal: 200, fat: 1, carbs: 42, protein: 7 }),
  us("us-cheese", "Cheddar Slices", "1 slice (21g)", 21, {
    kcal: 80,
    fat: 6,
    carbs: 0.5,
    protein: 5,
  }),
  eu("eu-bread", "Wholemeal Bread", { kcal: 247, fat: 3.4, carbs: 41, protein: 13 }),
  eu("eu-chocolate", "Dark Chocolate 70%", { kcal: 579, fat: 42, carbs: 33, protein: 8 }),
  eu("eu-milk", "Semi-Skimmed Milk", { kcal: 47, fat: 1.7, carbs: 4.8, protein: 3.5 }),
  eu("eu-rice", "Basmati Rice", { kcal: 356, fat: 0.5, carbs: 78, protein: 8.5 }),
  dual("dual-cereal", "Corn Flakes", 30, { kcal: 378, fat: 0.9, carbs: 84, protein: 7 }),
  dual("dual-biscuits", "Digestive Biscuits", 15, { kcal: 480, fat: 21, carbs: 63, protein: 7 }),
  dual("dual-juice", "Orange Juice", 200, { kcal: 45, fat: 0.5, carbs: 10, protein: 0.7 }),
  dual("dual-muesli", "Fruit Muesli", 45, { kcal: 362, fat: 6, carbs: 62, protein: 9 }),
  kjOnly("kj-crackers", "Rice Crackers", { kj: 1650, fat: 3, carbs: 80, protein: 7 }),
  kjOnly("kj-hummus", "Classic Hummus", { kj: 1180, fat: 24, carbs: 9, protein: 7 }),
  us(
    "tilted-granola",
    "Oat Crunch Granola",
    "2/3 cup (55g)",
    55,
    { kcal: 240, fat: 9, carbs: 34, protein: 6 },
    { rotate: -8 },
  ),
  eu(
    "tilted-bread",
    "Wholemeal Bread",
    { kcal: 247, fat: 3.4, carbs: 41, protein: 13 },
    { rotate: 6 },
  ),
  us(
    "faint-chips",
    "Sea Salt Potato Chips",
    "1 oz (28g)",
    28,
    { kcal: 160, fat: 10, carbs: 15, protein: 2 },
    { faint: true },
  ),
  dual(
    "faint-cereal",
    "Corn Flakes",
    30,
    { kcal: 378, fat: 0.9, carbs: 84, protein: 7 },
    { faint: true },
  ),
  us(
    "small-yogurt",
    "Plain Greek Yogurt",
    "1 container (170g)",
    170,
    { kcal: 100, fat: 0.5, carbs: 6, protein: 18 },
    { small: true },
  ),
  kjOnly(
    "small-crackers",
    "Rice Crackers",
    { kj: 1650, fat: 3, carbs: 80, protein: 7 },
    { small: true },
  ),
];

function render({ title, servingLine, columns, rows, look }) {
  const ink = look.faint ? "#9a9a9a" : "#111";
  const scale = look.small ? 0.55 : 1;
  const size = (n) => n * scale;
  const cell = { width: size(190), textAlign: "right" };
  const line = (children, extra = {}) =>
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          borderTop: `${size(2)}px solid ${ink}`,
          padding: `${size(8)}px 0`,
          fontSize: size(28),
          ...extra,
        },
      },
      ...children,
    );
  return h(
    "div",
    {
      style: {
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#e9e4da",
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          color: ink,
          padding: size(32),
          width: size(720),
          border: `${size(3)}px solid ${ink}`,
          ...(look.rotate ? { transform: `rotate(${look.rotate}deg)` } : {}),
        },
      },
      h("div", { style: { fontSize: size(40), fontWeight: 700 } }, title),
      h("div", { style: { fontSize: size(24), marginBottom: size(10) } }, servingLine),
      line(
        [
          h("span", { style: { flex: 1 } }, ""),
          ...columns.map((c) => h("span", { style: { ...cell, fontWeight: 700 } }, c)),
        ],
        { fontSize: size(22) },
      ),
      ...rows.map(([label, values]) =>
        line([
          h("span", { style: { flex: 1 } }, label),
          ...values.map((v) => h("span", { style: cell }, v)),
        ]),
      ),
    ),
  );
}

const SIZE = { width: 900, height: 700 };

await mkdir(OUT, { recursive: true });
const manifest = [];
for (const spec of CASES) {
  const png = Buffer.from(await new ImageResponse(render(spec), SIZE).arrayBuffer());
  await writeFile(new URL(`${spec.id}.png`, OUT), png);
  manifest.push({ id: spec.id, image: `${spec.id}.png`, mode: "label", truth: spec.expected });
}
await writeFile(new URL("manifest.json", OUT), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifest.length} labels to eval/data/labels/`);
