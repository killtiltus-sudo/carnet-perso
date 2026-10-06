// Vérification automatique des parcours principaux (facultatif, pour développeur).
// Prérequis : Node.js et Playwright (npm i -D playwright).
// Lancement : node outils/verifier-parcours.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.join(process.env.PW_MODULE || '', 'playwright')); }
const { chromium, devices } = playwright;

const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const urlFichier = pathToFileURL(path.join(dossier, 'index.html')).href;
const dossierCaptures = process.env.CAPTURES || path.join(os.tmpdir(), 'mes-soins-captures');
fs.mkdirSync(dossierCaptures, { recursive: true });

let echecs = 0, reussites = 0;
function verifier(cond, message) {
  if (cond) { reussites++; console.log('  ✔', message); }
  else { echecs++; console.log('  ✘', message); }
}

const navigateur = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

async function nouvellePage(options = {}, heure = '2026-10-06T07:50:00+02:00') {
  const contexte = await navigateur.newContext({ ...devices['iPhone 13'], locale: 'fr-FR', timezoneId: 'Europe/Paris', acceptDownloads: true, ...options });
  const page = await contexte.newPage();
  const erreurs = [];
  const requetes = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('request', r => requetes.push(r.url()));
  await page.clock.install({ time: new Date(heure) });
  return { contexte, page, erreurs, requetes };
}

// ---------------------------------------------------------------
console.log('1. Accueil (fichier local, iPhone, 6 octobre 2026 à 7 h 50)');
let { contexte, page, erreurs, requetes } = await nouvellePage();
await page.goto(urlFichier);
verifier(await page.locator('#bandeau-demo').isVisible(), 'bandeau « données fictives » visible');
const accueil = await page.locator('main').innerText();
verifier(accueil.includes('Prise de sang (DÉMO)') && accueil.includes('7 h 45'), 'prochain rendez-vous : prise de sang de 7 h 45');
verifier(accueil.includes('Séance de chimiothérapie — cycle 2'), 'prochains traitements : chimiothérapie cycle 2');
verifier((await page.locator('main .prise').count()) === 2, 'deux prises du jour (médicament A à 8 h et 20 h)');
verifier(!accueil.includes('DÉMO D'), 'médicament D (dose « ? ») absent des prises');
verifier(accueil.includes('Boîte : GÉNÉRIQUE DÉMO A'), 'nom sur la boîte affiché avec la prise');
await page.screenshot({ path: path.join(dossierCaptures, '1-accueil-iphone.png'), fullPage: true });

console.log('2. Cocher une prise');
await page.goto(urlFichier + '#/prises');
const caseA = page.locator('input[data-cle="2026-10-06|med-demo-a|08:00"]');
await caseA.check();
verifier(await caseA.isChecked(), 'case « Pris » cochée');
verifier((await page.locator('main').innerText()).includes('1 sur 2 cochée'), 'progression mise à jour');
await page.reload();
verifier(await page.locator('input[data-cle="2026-10-06|med-demo-a|08:00"]').isChecked(), 'coche conservée après rechargement');
await page.locator('button[data-delta="1"]').click();
verifier(await page.locator('input[data-cle="2026-10-07|med-demo-b|08:00"]').isDisabled(), 'prises du lendemain non cochables');
verifier((await page.locator('main').innerText()).includes('Médicament DÉMO B'), 'médicament B présent le mercredi');
await page.screenshot({ path: path.join(dossierCaptures, '2-prises-iphone.png'), fullPage: true });

console.log('3. Historique');
await page.goto(urlFichier + '#/historique');
const histo = await page.locator('main').innerText();
verifier(histo.includes('Médicament DÉMO A') && histo.includes('8 h 00'), 'prise cochée visible dans l’historique');
verifier(histo.includes('Rendez-vous passés non marqués'), 'rendez-vous passés à marquer');
await page.locator('button[data-action="marquer-realise"][data-id="rdv-demo-02"]').click();
verifier((await page.locator('main').innerText()).match(/Rendez-vous réalisés\s+Prise de sang/), 'rendez-vous marqué comme réalisé');

console.log('4. Calendrier');
await page.goto(urlFichier + '#/calendrier');
await page.locator('button[data-iso="2026-10-08"]').click();
let cal = await page.locator('main').innerText();
verifier(cal.includes('Séance de chimiothérapie — cycle 2'), 'chimiothérapie affichée le 8 octobre');
await page.locator('button[data-iso="2026-10-20"]').click();
cal = await page.locator('main').innerText();
verifier(cal.includes('Scanner de contrôle') && cal.includes('Heure à confirmer') && cal.includes('À confirmer'), 'scanner sans heure affiché « À confirmer »');
await page.locator('button[data-action="mois"][data-delta="1"]').click();
verifier((await page.locator('#titre-mois').innerText()).toLowerCase().includes('novembre'), 'navigation vers novembre');
await page.locator('button[data-iso="2026-11-05"]').click();
verifier((await page.locator('main').innerText()).includes('cycle 3'), 'chimiothérapie cycle 3 le 5 novembre');
await page.locator('input[data-type="chimiotherapie"]').uncheck();
verifier(!(await page.locator('main').innerText()).includes('cycle 3'), 'filtre par type');
await page.screenshot({ path: path.join(dossierCaptures, '3-calendrier-iphone.png'), fullPage: true });

console.log('5. Recherche par symptôme');
await page.goto(urlFichier + '#/symptomes');
await page.selectOption('#sel-symptome', 'Nausées');
let sym = await page.locator('#resultat-symptome').innerText();
verifier(sym.includes('Médicament DÉMO F') && sym.includes('Texte de posologie fictif') && sym.includes('Source'), 'consigne confirmée : médicament, posologie et source');
await page.screenshot({ path: path.join(dossierCaptures, '4-symptome-trouve.png'), fullPage: true });
const MESSAGE = 'Aucune consigne confirmée dans les documents enregistrés. Contacte ton équipe soignante ou ton pharmacien.';
await page.selectOption('#sel-symptome', 'Diarrhée');
sym = await page.locator('#resultat-symptome').innerText();
verifier(sym.includes(MESSAGE), 'symptôme à consigne « a_confirmer » : message d’absence');
verifier(!sym.includes('DÉMO G') && !sym.includes('à préciser'), 'contenu « a_confirmer » non affiché');
await page.screenshot({ path: path.join(dossierCaptures, '5-symptome-absent.png'), fullPage: true });
await page.selectOption('#sel-symptome', 'Aphtes / bouche douloureuse');
sym = await page.locator('#resultat-symptome').innerText();
verifier(sym.includes(MESSAGE) && !sym.includes('Bain de bouche'), 'consigne « confirme » sans posologie : refusée');
await page.fill('#txt-symptome', 'envie de vomir');
await page.click('#form-symptome button[type="submit"]');
verifier((await page.locator('#resultat-symptome').innerText()).includes('Médicament DÉMO F'), 'saisie libre via un synonyme');
await page.fill('#txt-symptome', 'mal de tête');
await page.click('#form-symptome button[type="submit"]');
verifier((await page.locator('#resultat-symptome').innerText()).includes(MESSAGE), 'saisie libre inconnue : message d’absence');

console.log('6. À confirmer');
await page.goto(urlFichier + '#/a-confirmer');
const ac = await page.locator('main').innerText();
for (const t of ['Scanner de contrôle', 'Heure manquante', 'Consultation infirmière', 'Médicament DÉMO D', 'Dose incomplète', 'Médicament DÉMO E', 'Diarrhée', 'Aphtes', 'sans posologie', 'Pharmacie Exemple', 'Téléphone manquant'])
  verifier(ac.includes(t), `« ${t} » listé`);
verifier((await page.locator('nav [data-compte]').first().textContent()).trim() === '7', 'compteur : 7 éléments à confirmer');
verifier(!(await page.locator('details.non-valide').first().evaluate(d => d.open)), 'valeurs non validées repliées par défaut');
await page.screenshot({ path: path.join(dossierCaptures, '6-a-confirmer.png'), fullPage: true });

console.log('7. Export .ics');
await page.goto(urlFichier + '#/rappels');
const [telechargement] = await Promise.all([page.waitForEvent('download'), page.click('button[data-action="ics"][data-quoi="tout"]')]);
const ics = fs.readFileSync(await telechargement.path(), 'utf-8');
fs.writeFileSync(path.join(dossierCaptures, 'export.ics'), ics);
verifier(ics.startsWith('BEGIN:VCALENDAR') && ics.trim().endsWith('END:VCALENDAR'), 'fichier .ics bien formé');
verifier(ics.includes('UID:rdv-rdv-demo-03@') && ics.includes('DTSTART:20261006T074500'), 'rendez-vous confirmé exporté');
verifier(!ics.includes('rdv-demo-06') && !ics.includes('rdv-demo-08') && !ics.includes('DÉMO D') && !ics.includes('DÉMO E'), 'éléments à confirmer exclus');
verifier(ics.includes('RRULE:FREQ=DAILY;UNTIL=20261105T235959'), 'prises récurrentes limitées à 30 jours');
verifier(ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'), 'jours de la semaine respectés');
verifier(ics.includes('TRIGGER:-PT1440M') && ics.includes('TRIGGER:-PT60M') && ics.includes('TRIGGER:PT0S'), 'alertes du calendrier présentes');
verifier(ics.split('\r\n').every(l => Buffer.byteLength(l) <= 75), 'lignes pliées à 75 octets');
await page.check('input[data-reglage="masquerDetails"]');
const [t2] = await Promise.all([page.waitForEvent('download'), page.click('button[data-action="ics"][data-quoi="tout"]')]);
const ics2 = fs.readFileSync(await t2.path(), 'utf-8');
verifier(!ics2.includes('DÉMO') && ics2.includes('Prise de médicament'), 'option « masquer les détails »');
await page.screenshot({ path: path.join(dossierCaptures, '7-rappels.png'), fullPage: true });

console.log('8. Rappel à l’écran (application ouverte)');
await page.goto(urlFichier + '#/accueil');
await page.clock.fastForward('10:30'); // 7 h 50 → 8 h 00 et 30 s
await page.waitForTimeout(200);
verifier(await page.locator('.rappel').count() === 0, 'pas de rappel pour une prise déjà cochée (8 h)');
await page.evaluate(() => { localStorage.removeItem('mesSoins.v1.rappelsEmis'); const p = JSON.parse(localStorage.getItem('mesSoins.v1.prises')); delete p['2026-10-06|med-demo-a|08:00']; localStorage.setItem('mesSoins.v1.prises', JSON.stringify(p)); });
await page.clock.fastForward('00:31');
await page.waitForTimeout(200);
const rappel = await page.locator('#zone-rappels').innerText();
verifier(rappel.includes('Prise prévue à 8 h 00') && rappel.includes('Médicament DÉMO A'), 'rappel affiché pour une prise non cochée');
verifier(!/rattrap|doubl|arrêt/i.test(rappel), 'aucune suggestion de rattrapage ou de modification');
verifier(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
verifier(requetes.every(u => u.startsWith('file:') || u.startsWith('blob:') || u.startsWith('data:')), 'aucune requête réseau');
await contexte.close();

console.log('9. Import et validation');
({ contexte, page, erreurs } = await nouvellePage());
await page.goto(urlFichier + '#/donnees');
await page.setInputFiles('#fichier-donnees', { name: 'casse.json', mimeType: 'application/json', buffer: Buffer.from('{ "rendez_vous": [ ') });
verifier((await page.locator('main').innerText()).includes('Import refusé'), 'JSON invalide refusé');
const perso = {
  meta: { donnees_fictives: false, version_schema: 1 },
  rendez_vous: [
    { id: 'r1', type: 'consultation', titre: 'Test heure mal écrite', date: '2026-10-07', heure: '9h', statut: 'confirme', source: 'test' },
    { id: 'r2', type: 'consultation', titre: 'Test date impossible', date: '2026-02-30', heure: '09:00', statut: 'confirme', source: 'test' },
    { id: 'r3', type: 'consultation', titre: 'Test correct', date: '2026-10-07', heure: '09:00', statut: 'confirme', source: 'test' },
    { id: 'r3', type: 'consultation', titre: 'Test doublon', date: '2026-10-07', heure: '09:00', statut: 'confirme', source: 'test' },
    { id: 'r5', type: 'consultation', titre: 'Statut inconnu', date: '2026-10-07', heure: '10:00', statut: 'ok', source: 'test' }
  ],
  medicaments: [
    { id: 'm1', nom: 'Horaire mal écrit', dose: '1 comprimé', horaires: ['8:00'], date_debut: '2026-10-01', statut: 'confirme', source: 'test' },
    { id: 'm2', nom: 'Dose vide', dose: '', horaires: ['08:00'], date_debut: '2026-10-01', statut: 'confirme', source: 'test' },
    { id: 'm3', nom: 'Dose à préciser', dose: 'à préciser', horaires: ['08:00'], date_debut: '2026-10-01', statut: 'confirme', source: 'test' },
    { id: 'm4', nom: 'Médicament correct', dose: '1 comprimé', horaires: ['09:00'], date_debut: '2026-10-01', statut: 'confirme', source: 'test' }
  ],
  consignes_symptomes: [
    { id: 'c1', symptome: 'Toux', consigne: 'Texte', statut: 'confirme' },
    { id: 'c2', symptome: 'Rhume', medicament: 'X', posologie: '?', consigne: 'Texte', statut: 'confirme', source: 'doc' }
  ],
  contacts: []
};
await page.setInputFiles('#fichier-donnees', { name: 'perso.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(perso)) });
verifier((await page.locator('main').innerText()).includes('Import réussi'), 'fichier valide importé');
verifier(!(await page.locator('#bandeau-demo').isVisible()), 'bandeau démo retiré pour des données réelles');
await page.goto(urlFichier + '#/prises');
const pr = await page.locator('main').innerText();
verifier(pr.includes('Médicament correct') && !pr.includes('Horaire mal écrit') && !pr.includes('Dose vide') && !pr.includes('Dose à préciser'), 'seul le médicament complet apparaît dans les prises');
await page.goto(urlFichier + '#/a-confirmer');
const ac2 = await page.locator('main').innerText();
for (const t of ['Heure invalide « 9h »', 'Date invalide « 2026-02-30 »', 'utilisé plusieurs fois', 'Statut inconnu « ok »', 'Horaire invalide « 8:00 »', 'Dose manquante', 'Dose incomplète', 'Source manquante', 'sans posologie complète'])
  verifier(ac2.includes(t), `validation : « ${t} »`);
await page.goto(urlFichier + '#/symptomes');
await page.fill('#txt-symptome', 'toux');
await page.click('#form-symptome button[type="submit"]');
verifier((await page.locator('#resultat-symptome').innerText()).includes(MESSAGE), 'consigne sans source jamais affichée');
verifier(erreurs.length === 0, 'aucune erreur JavaScript' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));
await contexte.close();

console.log('10. Serveur local avec donnees_medicales.json à côté');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mes-soins-'));
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(dossier, f), path.join(tmp, f));
for (const d of ['icones', 'polices']) {
  fs.mkdirSync(path.join(tmp, d));
  for (const f of fs.readdirSync(path.join(dossier, d))) fs.copyFileSync(path.join(dossier, d, f), path.join(tmp, d, f));
}
fs.writeFileSync(path.join(tmp, 'donnees_medicales.json'), JSON.stringify(perso));
const serveur = http.createServer((req, res) => {
  const f = path.join(tmp, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/$/, '/index.html'));
  if (!f.startsWith(tmp) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  const types = { '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'text/html; charset=utf-8' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const port = serveur.address().port;
({ contexte, page, erreurs } = await nouvellePage());
await page.goto(`http://127.0.0.1:${port}/#/donnees`);
verifier((await page.locator('main').innerText()).includes('donnees_medicales.json » placé à côté'), 'fichier de données lu automatiquement');
verifier(!(await page.locator('#bandeau-demo').isVisible()), 'pas de bandeau démo');
await contexte.close();

console.log('10b. Application installable et hors connexion');
({ contexte, page, erreurs } = await nouvellePage());
await page.goto(`http://127.0.0.1:${port}/`);
verifier(await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; }), 'service worker actif');
const manifeste = await page.evaluate(() => fetch('manifest.webmanifest').then(r => r.json()));
verifier(manifeste.display === 'standalone' && manifeste.icons.length >= 2, 'manifeste valide');
await page.reload();
await contexte.setOffline(true);
await page.reload();
verifier((await page.locator('main h1').innerText()).length > 0, 'fonctionne hors connexion après le premier chargement');
await contexte.setOffline(false);
fs.writeFileSync(path.join(tmp, 'index.html'), fs.readFileSync(path.join(tmp, 'index.html'), 'utf-8').replace('>Bonjour<', '>Bonjour (nouvelle version)<'));
await page.reload();
verifier((await page.locator('main h1').innerText()).includes('nouvelle version'), 'une mise à jour publiée s’affiche dès la réouverture');
await contexte.close();
serveur.close();

console.log('10c. Adresse publique : aucun fichier de données lu');
({ contexte, page, erreurs, requetes } = await nouvellePage({ serviceWorkers: 'block' }));
await page.route('https://exemple.test/**', route => {
  const chemin = new URL(route.request().url()).pathname.replace(/^\/$/, '/index.html');
  const f = path.join(tmp, chemin);
  if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
  route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: f.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' });
});
await page.goto('https://exemple.test/#/donnees');
verifier(!requetes.some(u => u.includes('donnees_medicales.json')), 'donnees_medicales.json jamais demandé sur une adresse publique');
verifier((await page.locator('main').innerText()).includes('démonstration'), 'données de démonstration utilisées');
await contexte.close();

console.log('10d. Apparence');
({ contexte, page, erreurs } = await nouvellePage({ colorScheme: 'dark' }));
await page.goto(urlFichier);
const fondAuto = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
verifier(fondAuto === 'rgb(15, 21, 32)', 'mode sombre automatique quand le téléphone est en sombre');
await page.goto(urlFichier + '#/plus');
await page.check('input[name="theme"][value="clair"]');
verifier(await page.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(243, 246, 250)', 'choix « Clair » forcé');
await page.reload();
verifier(await page.evaluate(() => document.documentElement.dataset.theme) === 'light', 'choix d’apparence conservé');
await page.check('input[name="theme"][value="sombre"]');
await page.goto(urlFichier + '#/prises');
await page.screenshot({ path: path.join(dossierCaptures, '12-prises-sombre.png'), fullPage: true });
verifier(erreurs.length === 0, 'aucune erreur JavaScript (apparence)');
await contexte.close();

console.log('11. Affichage ordinateur');
({ contexte, page, erreurs } = await nouvellePage({ ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }));
await page.goto(urlFichier);
verifier(await page.locator('nav a[data-route="historique"]').isVisible(), 'menu latéral complet sur ordinateur');
verifier(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'pas de défilement horizontal');
await page.screenshot({ path: path.join(dossierCaptures, '8-accueil-ordinateur.png'), fullPage: true });
await page.goto(urlFichier + '#/calendrier');
await page.screenshot({ path: path.join(dossierCaptures, '9-calendrier-ordinateur.png'), fullPage: true });
await contexte.close();

({ contexte, page } = await nouvellePage({ colorScheme: 'dark' }));
await page.goto(urlFichier + '#/donnees');
await page.setInputFiles('#fichier-donnees', path.join(dossier, 'donnees_medicales.exemple.json'));
const debordements = [];
for (const r of ['accueil', 'calendrier', 'prises', 'historique', 'rappels', 'a-confirmer', 'donnees', 'plus']) {
  await page.goto(urlFichier + '#/' + r);
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) debordements.push(r);
}
await page.goto(urlFichier + '#/symptomes');
await page.selectOption('#sel-symptome', 'Nausées');
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) debordements.push('symptomes');
verifier(debordements.length === 0, 'pas de défilement horizontal sur iPhone, sur toutes les pages' + (debordements.length ? ' : ' + debordements.join(', ') : ''));
await page.screenshot({ path: path.join(dossierCaptures, '11-symptome-sombre.png'), fullPage: true });
await page.goto(urlFichier);
await page.screenshot({ path: path.join(dossierCaptures, '10-accueil-sombre.png'), fullPage: true });
await contexte.close();

await navigateur.close();
console.log(`\n${reussites} vérifications réussies, ${echecs} échec(s). Captures : ${dossierCaptures}`);
process.exit(echecs ? 1 : 0);
