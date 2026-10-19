# Tracciati voli GVA 2026

Due pagine, nessun passaggio di build:

- **`volo-3d.html`** — i voli in 3D sulla mappa, con le anomalie termiche rilevate dai
  satelliti e gli incendi segnalati a terra.
- **`poster.html`** — il poster statico.

I tracciati stanno in `kml/`, le rilevazioni in `anomalies.json`, le segnalazioni a
terra in `incendi.json` (scritto a mano).

## Farla girare

La pagina legge dei file con `fetch`, quindi va servita da un server HTTP: aprendo il
file con `file://` non funziona.

```sh
python3 -m http.server 8000
# oppure: npx live-server
```

### La chiave Mapbox

La chiave **non sta nel repository**: una chiave scritta in un file versionato è una
chiave regalata a chiunque. Vive in `.env`, che è ignorato da git.

```sh
cp .env.example .env        # poi scrivi la chiave dopo MAPBOX_TOKEN=
node genera-config.mjs      # ricava config.json, anch'esso ignorato da git
```

Serve una chiave *pubblica* (inizia con `pk.`), da mapbox.com → Account → Access
tokens: la pagina gira nel browser, quindi una chiave segreta (`sk.`) sarebbe visibile
a chiunque.

Se `config.json` manca, la pagina si apre lo stesso e dice cosa fare.
