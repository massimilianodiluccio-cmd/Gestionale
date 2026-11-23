# Archivio Clienti – note per Claude

App web statica (index.html unico) pubblicata su Vercel dal branch `main`: ogni push va online in ~1 minuto.
Utente: Massimiliano Di Luccio, consulente finanziario. Interfaccia e messaggi in italiano.

## Dati
- I dati dei clienti NON stanno nel repository: sono cifrati (AES-GCM, chiave da password PBKDF2) nell'IndexedDB del telefono.
- Non inserire mai dati di clienti in chiaro nel repository, nei commit o nei messaggi di commit.

## Consegna di schede all'app (cartella inbox/)
Quando l'utente manda in chat documenti o informazioni su un cliente e chiede di inserirli nell'app:
1. Prepara un JSON scheda fuori dal repository (es. /tmp/scheda.json):
   `{"provenienza":"da quale documento/colloquio","extra":"note libere","cliente":{...}}`
   Chiavi di `cliente`: quelle dei campi in `F` di index.html (anag, lav) e le liste fam, int, ric, az, att, pas, ban, cop
   (array di oggetti con le chiavi di F[lista]); date AAAA-MM-GG, importi numerici, opzioni esattamente come in F.
2. `node tools/consegna.mjs /tmp/scheda.json [documenti originali...]` → crea `inbox/<id>.json` cifrato con
   `inbox/chiave-pubblica.json` e aggiorna `inbox/index.json`.
3. Commit e push su main. All'apertura l'app importa: crea la scheda (match per codice fiscale o nome+cognome)
   oppure aggiunge i dati a quella esistente senza sovrascrivere campi già compilati; allega i documenti.
Se manca `inbox/chiave-pubblica.json`, chiedi all'utente: app → "Ricevi schede da Claude" → Attiva → Copia chiave.
La chiave incollata ha forma `CHIAVE-ARCHIVIO-CLIENTI:<base64 di JSON {kty,n,e,alg}>`: decodificala e salvala come JSON.

## Versione in Claude
Esiste anche un artifact claude.ai (slug 573b46c4-7d23-4cb7-820f-85851b018ffb) con lo stesso index.html:
quando modifichi l'app, ripubblica lì lo stesso file.

## Ogni elaborato per i clienti
Disclaimer obbligatorio con la data del giorno; firma "Massimiliano Di Luccio".

## Schede inviate dall'app a Claude
Nell'app: menu ⋮ della scheda → "Invia a Claude" copia un testo che inizia con
`SCHEDA DALL'APP ARCHIVIO CLIENTI` e termina con un blocco ```json {"archivio":"scheda-app","cliente":{...}}```.
Usalo come fonte per proposte, analisi, relazioni. Per rimandare dati nuovi all'app usa la consegna (inbox/):
l'import aggiunge dati e righe nuove ma NON sovrascrive campi già compilati (per correzioni, dillo all'utente).
I documenti arrivano dall'app con "Condividi" (sezione Documenti).

## Incentivazione CF 2026 (sezione dell'app)
Dati dei consulenti della rete (raccolta in migliaia di euro) e report individuali dei bonus maturandi.
Per consegnare dati all'app: JSON `{"tipo":"cf","consulenti":[{"cod","nome","alias (nome precedente, facoltativo)","cluster":"PTF 20-50 mln","rn","revo","ass","data":"AAAA-MM-GG","opPart":false,"note"}]}`
con `node tools/consegna.mjs`; i consulenti con lo stesso nome vengono aggiornati. Cluster ammessi: PTF sotto 20 mln,
PTF 20-50 mln, PTF 50-150 mln, PTF oltre 150 mln. Parametri dal Regolamento BG Premium 2026 (par. G, H, J): fasce e aliquote per cluster (sotto 20 mln aliquote diverse per netta ed evoluta), +20% solo dai 20 mln con netta minima = prima soglia del cluster, +10% con RN assicurativa da 500k, maggiorazioni sommate, aliquota della fascia raggiunta su tutta la raccolta, evoluta -50% se RN negativa, tetti 250/300/350/420k (+200k, +230k oltre 150 mln). Verificato con i 4 esempi del regolamento. Modificabili nell'app.
