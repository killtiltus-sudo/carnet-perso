// Chiffre le fichier de données pour les mises à jour automatiques, et produit les codes d'abonnement.
// La clé n'est JAMAIS écrite dans le dépôt : elle est passée par la variable d'environnement MES_SOINS_CLE.
//
//   node outils/chiffrer.mjs nouvelle-cle
//   MES_SOINS_CLE=… node outils/chiffrer.mjs chiffrer donnees_medicales.json carnet.chiffre.json
//   MES_SOINS_CLE=… node outils/chiffrer.mjs codes carnet.chiffre.json
//   MES_SOINS_CLE=… node outils/chiffrer.mjs dechiffrer carnet.chiffre.json donnees_medicales.json
//   MES_SOINS_CLE=… node outils/chiffrer.mjs document bilan.pdf documents/   (affiche l'entrée à ajouter dans « documents »)
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const subtle = webcrypto.subtle;
const b64 = u => Buffer.from(u).toString('base64');

async function cleDerivee(cle, sel, iterations, usage) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(cle), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

export function nouvelleCle() {
  return Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

export async function chiffrer(donnees, cle, maj = new Date().toISOString(), iterations = 100000) {
  const sel = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const k = await cleDerivee(cle, sel, iterations, 'encrypt');
  const clair = new TextEncoder().encode(JSON.stringify({ maj, donnees }));
  const chiffre = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, k, clair));
  return { format: 'mes-soins-chiffre', v: 1, kdf: 'PBKDF2-SHA256', iterations, sel: b64(sel), iv: b64(iv), donnees: b64(chiffre) };
}

export async function dechiffrer(env, cle) {
  const k = await cleDerivee(cle, Buffer.from(env.sel, 'base64'), env.iterations, 'decrypt');
  const clair = await subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(env.iv, 'base64') }, k, Buffer.from(env.donnees, 'base64'));
  return JSON.parse(new TextDecoder().decode(clair));
}

// Documents (PDF, photos…) : mêmes paramètres, contenu brut au lieu du JSON. Nom de fichier aléatoire.
export async function chiffrerOctets(octets, cle, iterations = 100000) {
  const sel = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const k = await cleDerivee(cle, sel, iterations, 'encrypt');
  const chiffre = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, k, octets));
  return { format: 'mes-soins-document', v: 1, kdf: 'PBKDF2-SHA256', iterations, sel: b64(sel), iv: b64(iv), donnees: b64(chiffre) };
}
export async function dechiffrerOctets(env, cle) {
  const k = await cleDerivee(cle, Buffer.from(env.sel, 'base64'), env.iterations, 'decrypt');
  return Buffer.from(await subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(env.iv, 'base64') }, k, Buffer.from(env.donnees, 'base64')));
}
const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp' };

export function codeAbonnement(fichier, cle, role) {
  return 'MS2:' + Buffer.from(JSON.stringify({ f: fichier, k: cle, r: role })).toString('base64url');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [commande, a, b] = process.argv.slice(2);
  const cle = process.env.MES_SOINS_CLE;
  if (commande === 'nouvelle-cle') console.log(nouvelleCle());
  else if (!cle) { console.error('Variable MES_SOINS_CLE manquante.'); process.exit(1); }
  else if (commande === 'chiffrer' && a && b) {
    fs.writeFileSync(b, JSON.stringify(await chiffrer(JSON.parse(fs.readFileSync(a, 'utf-8')), cle)) + '\n');
    console.log(`Écrit : ${b}`);
  } else if (commande === 'dechiffrer' && a && b) {
    const contenu = await dechiffrer(JSON.parse(fs.readFileSync(a, 'utf-8')), cle);
    fs.writeFileSync(b, JSON.stringify(contenu.donnees, null, 2) + '\n');
    console.log(`Écrit : ${b} (données publiées le ${contenu.maj})`);
  } else if (commande === 'document' && a && b) {
    const octets = fs.readFileSync(a);
    const nom = Buffer.from(webcrypto.getRandomValues(new Uint8Array(12))).toString('base64url') + '.bin';
    fs.mkdirSync(b, { recursive: true });
    fs.writeFileSync(path.join(b, nom), JSON.stringify(await chiffrerOctets(octets, cle)) + '\n');
    const type = TYPES[path.extname(a).slice(1).toLowerCase()] || 'application/octet-stream';
    console.log(JSON.stringify({ chemin: `documents/${nom}`, nom: path.basename(a), type, taille: octets.length }));
  } else if (commande === 'codes' && a) {
    const f = path.basename(a);
    console.log('Code patient :\n' + codeAbonnement(f, cle, 'patient') + '\n\nCode proche (lecture seule) :\n' + codeAbonnement(f, cle, 'proche'));
  } else { console.error('Commande inconnue. Voir l’en-tête de ce fichier.'); process.exit(1); }
}
