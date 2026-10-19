// Converte i tracciati KML da <gx:Track> a <LineString>.
//
//   <gx:Track>
//     <when>2026-10-07T08:00:00Z</when>
//     <gx:coord>-122.0822 37.4220 0</gx:coord>     (lon lat alt, separati da spazi)
//   </gx:Track>
//
// diventa
//
//   <LineString>
//     <altitudeMode>absolute</altitudeMode>
//     <coordinates>
//       -122.0822,37.4220,0                       (lon,lat,alt, una riga per punto)
//     </coordinates>
//   </LineString>
//
// Cosa viene conservato: nome, stile, id del Placemark, ordine dei punti, quota e
// <altitudeMode>. Cosa si perde: <when>, perché in un LineString non c'è dove
// mettere gli istanti; e <extrude>, che è solo una scelta di visualizzazione.
//
// Uso:
//   node converti-kml.mjs                      legge ./kml, scrive ./kml-line
//   node converti-kml.mjs cartella             legge cartella, scrive cartella-line
//   node converti-kml.mjs cartella uscita
//   node converti-kml.mjs cartella uscita --sovrascrivi   scrive sopra gli originali

import { readdir, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const TRACCIATO = /<gx:Track>([\s\S]*?)<\/gx:Track>/g;
// Lo spazio prima del tag serve a ricostruire l'indentazione dei figli.
const APERTURA = /([ \t]*)<gx:Track>/;
const COORDINATA = /<gx:coord>\s*([^<]*?)\s*<\/gx:coord>/g;
const ALTITUDE_MODE = /<altitudeMode>\s*([^<]*?)\s*<\/altitudeMode>/;

function convertiTracciato(blocco, contenuto) {
  const rientro = APERTURA.exec(blocco)?.[1] ?? "";
  const figlio = `${rientro}\t`;
  const nipote = `${rientro}\t\t`;

  const punti = [...contenuto.matchAll(COORDINATA)]
    .map(corrispondenza => corrispondenza[1].split(/\s+/).filter(Boolean).join(","))
    .filter(punto => punto.split(",").length >= 2);

  const altitudine = ALTITUDE_MODE.exec(contenuto)?.[1];
  const istanti = (contenuto.match(/<when>/g) || []).length;

  const righe = [`${rientro}<LineString>`];
  if (altitudine) righe.push(`${figlio}<altitudeMode>${altitudine}</altitudeMode>`);
  righe.push(`${figlio}<coordinates>`);
  punti.forEach(punto => righe.push(`${nipote}${punto}`));
  righe.push(`${figlio}</coordinates>`, `${rientro}</LineString>`);

  return { xml: righe.join("\n"), punti: punti.length, istanti };
}

function converti(testo) {
  let punti = 0;
  let istanti = 0;
  let tracciati = 0;

  const xml = testo.replace(TRACCIATO, (blocco, contenuto) => {
    const risultato = convertiTracciato(blocco, contenuto);
    tracciati += 1;
    punti += risultato.punti;
    istanti += risultato.istanti;
    return risultato.xml;
  });

  return { xml, tracciati, punti, istanti };
}

const [sorgente = "./kml", uscita, ...opzioni] = process.argv.slice(2);
const sovrascrivi = opzioni.includes("--sovrascrivi");
const destinazione = uscita ?? `${sorgente.replace(/\/+$/, "")}-line`;

const file = (await readdir(sorgente))
  .filter(nome => /\.kml$/i.test(nome))
  .sort((a, b) => a.localeCompare(b, "it", { numeric: true, sensitivity: "base" }));

if (!file.length) {
  console.error(`Nessun file .kml in ${sorgente}`);
  process.exit(1);
}

if (!sovrascrivi) await mkdir(destinazione, { recursive: true });

let totalePunti = 0;
let totaleTracciati = 0;
let totaleIstanti = 0;

for (const nome of file) {
  const originale = await readFile(path.join(sorgente, nome), "utf8");
  const { xml, tracciati, punti, istanti } = converti(originale);

  totalePunti += punti;
  totaleTracciati += tracciati;
  totaleIstanti += istanti;

  const meta = sovrascrivi ? path.join(sorgente, nome) : path.join(destinazione, nome);
  await writeFile(meta, xml, "utf8");

  console.log(
    `${nome.padEnd(18)} ` +
    `${tracciati ? `${tracciati} tracciato${tracciati === 1 ? "" : "i"} → ${punti} punti` : "nessun gx:Track, copiato com'è"}` +
    `${istanti ? `, ${istanti} istanti rimossi` : ""}`
  );
}

console.log(
  `\n${file.length} file in ${sovrascrivi ? sorgente : destinazione} · ` +
  `${totaleTracciati} tracciati convertiti · ${totalePunti} punti · ${totaleIstanti} istanti rimossi`
);
