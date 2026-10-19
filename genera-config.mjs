// Genera config.json a partire da .env.
//
// Il token Mapbox non può stare nel sorgente della pagina: il repository è pubblico e
// una chiave scritta in un file versionato è una chiave regalata. Vive quindi in
// ".env", e questo script ne ricava "config.json", che la pagina scarica all'avvio.
// Entrambi i file sono elencati in .gitignore.
//
//   node genera-config.mjs
//
// Non ha dipendenze: si legge il .env a mano, che per un file di una riga basta.

import { readFileSync, writeFileSync } from "node:fs";

const CHIAVE = "MAPBOX_TOKEN";

let sorgente;
try {
  sorgente = readFileSync(new URL("./.env", import.meta.url), "utf8");
} catch {
  console.error("Manca il file .env: copia .env.example in .env e scrivi lì il token.");
  process.exit(1);
}

// Righe "NOME=valore", con # per i commenti e virgolette facoltative attorno al valore.
const valori = {};
for (const riga of sorgente.split(/\r?\n/)) {
  const utile = riga.trim();
  if (!utile || utile.startsWith("#")) continue;
  const separatore = utile.indexOf("=");
  if (separatore < 1) continue;
  const nome = utile.slice(0, separatore).trim();
  let valore = utile.slice(separatore + 1).trim();
  if (/^(['"]).*\1$/.test(valore)) valore = valore.slice(1, -1);
  valori[nome] = valore;
}

const token = valori[CHIAVE];
if (!token) {
  console.error(`Nel .env non c'è ${CHIAVE}.`);
  process.exit(1);
}

// Una chiave segreta non va mai in una pagina web: la segnalazione arriva subito,
// prima che finisca su GitHub.
if (!token.startsWith("pk.")) {
  console.warn(
    `Attenzione: ${CHIAVE} non comincia con "pk.". In una pagina browser serve una ` +
    "chiave pubblica; una chiave segreta (sk.) va usata solo da un server."
  );
}

// Il file generato è JSON: la pagina lo scarica all'avvio e legge MAPBOX_TOKEN.
writeFileSync(
  new URL("./config.json", import.meta.url),
  `${JSON.stringify({ [CHIAVE]: token }, null, 2)}\n`,
  "utf8"
);

console.log(`config.json scritto (token di ${token.length} caratteri). Non è versionato.`);
