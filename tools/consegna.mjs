#!/usr/bin/env node
// Consegna cifrata di una scheda cliente all'app Archivio Clienti.
// Uso: node tools/consegna.mjs <scheda.json> [documento.pdf|.jpg|.png ...]
// La scheda è un JSON {"provenienza":"...","extra":"...","cliente":{...campi e liste dell'app...}}.
// Cifra con la chiave PUBBLICA in inbox/chiave-pubblica.json (RSA-OAEP-256 + AES-GCM 256)
// e scrive inbox/<id>.json aggiornando inbox/index.json. Nessun dato in chiaro finisce nel repository.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const { subtle } = globalThis.crypto;
const getRandomValues = a => globalThis.crypto.getRandomValues(a);
const randomUUID = () => globalThis.crypto.randomUUID();
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inbox = join(root, 'inbox');
const [, , schedaPath, ...docs] = process.argv;
if (!schedaPath) { console.error('Uso: node tools/consegna.mjs <scheda.json> [documenti...]'); process.exit(1); }
const keyPath = join(inbox, 'chiave-pubblica.json');
if (!existsSync(keyPath)) { console.error('Manca inbox/chiave-pubblica.json: chiedi la chiave di consegna all\'utente (app > Ricevi schede da Claude).'); process.exit(1); }
const jwk = JSON.parse(readFileSync(keyPath, 'utf8'));
const pub = await subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RSA-OAEP-256', ext: true }, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
const scheda = JSON.parse(readFileSync(schedaPath, 'utf8'));
const MIME = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const files = docs.map(p => {
  const buf = readFileSync(p); const tipo = MIME[extname(p).toLowerCase()];
  if (!tipo) throw new Error('Formato non supportato: ' + p);
  if (buf.length > 8 * 1024 * 1024) throw new Error('File oltre 8 MB: ' + p);
  return { nome: scheda.nomiFile?.[basename(p)] || basename(p), tipo, size: buf.length, data: buf.toString('base64') };
});
const payload = scheda.tipo === 'cf'
  ? { tipo: 'cf', consulenti: scheda.consulenti || [], ...(scheda.em ? { em: scheda.em } : {}) }
  : { provenienza: scheda.provenienza || '', extra: scheda.extra || '', cliente: scheda.cliente || {}, files };
const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
const iv = getRandomValues(new Uint8Array(12));
const ct = Buffer.from(await subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(payload))));
const ek = Buffer.from(await subtle.encrypt({ name: 'RSA-OAEP' }, pub, await subtle.exportKey('raw', aes)));
const id = new Date().toISOString().slice(0, 10) + '-' + randomUUID().slice(0, 8);
writeFileSync(join(inbox, id + '.json'), JSON.stringify({ v: 1, id, fp: jwk.n.slice(0, 16), ek: ek.toString('base64'), iv: Buffer.from(iv).toString('base64'), ct: ct.toString('base64') }));
const idxPath = join(inbox, 'index.json');
const idx = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, 'utf8')) : { pacchetti: [] };
idx.pacchetti.push({ id, file: id + '.json', creato: new Date().toISOString() });
writeFileSync(idxPath, JSON.stringify(idx, null, 1));
console.log('Pacchetto creato: inbox/' + id + '.json (' + files.length + ' documenti)');
