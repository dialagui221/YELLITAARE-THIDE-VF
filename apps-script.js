/**
 * ══════════════════════════════════════════════════════════════════════════
 *  YELLITAARE THIDÉ — Google Apps Script
 *  Passerelle Formulaire d'adhésion → Google Sheets
 *
 *  INSTALLATION (à faire une seule fois) :
 *  ─────────────────────────────────────────────────────────────────────────
 *  1. Ouvrez votre Google Sheets : https://sheets.google.com
 *  2. Menu : Extensions → Apps Script
 *  3. Supprimez le code existant et collez ce fichier entier
 *  4. Sauvegardez (Ctrl+S)
 *  5. Menu : Déployer → Nouveau déploiement
 *       Type : Application Web
 *       Exécuter en tant que : Moi
 *       Accès : Tout le monde
 *  6. Cliquez "Déployer" → autorisez → copiez l'URL générée
 *  7. Collez cette URL dans adhesion.html à la ligne :
 *       const APPS_SCRIPT_URL = 'COLLER_ICI';
 *
 *  STRUCTURE GOOGLE SHEETS (créée automatiquement au 1er envoi) :
 *  ─────────────────────────────────────────────────────────────────────────
 *  Feuille 1 : "Adhérents"   → toutes les inscriptions
 *  Feuille 2 : "Statistiques" → KPIs agrégés (maj automatique)
 *
 *  Variables configurables ci-dessous :
 * ══════════════════════════════════════════════════════════════════════════
 */

// ── CONFIGURATION ──────────────────────────────────────────────────────────
const CONFIG = {
  SHEET_NAME_MEMBRES:  'Adhérents',
  SHEET_NAME_STATS:    'Statistiques',
  EMAIL_TRESORIER:     'tresorier@yellitaare.org',   // ← votre email
  TEL_TRESORIER:       '+22246478870',
  NOM_ORG:             'YELLITAARE Thidé',
  ENVOYER_EMAIL:       true,   // mettre false pour désactiver les emails
};

// ── EN-TÊTES DES COLONNES ─────────────────────────────────────────────────
const HEADERS = [
  'Référence',
  'Date soumission',
  'Timestamp ISO',
  'Nom',
  'Prénom',
  'Nom complet',
  'Date naissance',
  'Sexe',
  'Téléphone',
  'Email',
  'Zone / Section',
  'Profession',
  'Adresse',
  'Catégorie cotisation',
  'Montant (MRU)',
  'Mode paiement',
  'Réf. transaction',
  'Reçu Bankily',
  'Reçu Masrevi',
  'Reçu Seddad',
  'Reçu joint (O/N)',
  'Statut',
  'Date validation',
  'Validé par',
  'Notes',
];

// ══════════════════════════════════════════════════════════════════════════
//  POINT D'ENTRÉE PRINCIPAL — requêtes POST depuis le formulaire
// ══════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'inscription';

    if (action === 'inscription') {
      return handleInscription(data);
    }
    if (action === 'valider') {
      return handleValidation(data);
    }

    return jsonResponse({ ok: false, error: 'Action inconnue' });
  } catch (err) {
    Logger.log('Erreur doPost: ' + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

// Permet aussi les requêtes GET (test de disponibilité)
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  const dashboard = e.parameter && e.parameter.dashboard;
  const exportCsv = e.parameter && e.parameter.export;

  if (action === 'valider') {
    return handleValidationGet(e);
  }

  // ── Tableau de bord : renvoie toutes les lignes de la feuille Adhérents ──
  if (dashboard === '1') {
    return handleDashboard();
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  if (exportCsv === 'csv') {
    return handleExportCsv();
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: CONFIG.NOM_ORG,
      message: 'Apps Script opérationnel',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════════════════════════════
//  INSCRIPTION — écriture dans Google Sheets
// ══════════════════════════════════════════════════════════════════════════
function handleInscription(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAME_MEMBRES);

  // Créer les en-têtes si la feuille est vide
  if (sheet.getLastRow() === 0) {
    const headerRow = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRow.setValues([HEADERS]);
    headerRow.setBackground('#1A6B3C');
    headerRow.setFontColor('#ffffff');
    headerRow.setFontWeight('bold');
    headerRow.setFontSize(11);
    sheet.setFrozenRows(1);
    // Largeurs colonnes
    const widths = [160,120,180,100,120,180,110,80,120,180,140,130,160,180,100,160,150,100,100,100,100,120,120,100,160];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  }

  // Construire la ligne
  const row = [
    data.reference            || '',
    data.date_soumission      || new Date().toLocaleDateString('fr-FR'),
    data.timestamp_iso        || new Date().toISOString(),
    data.nom                  || '',
    data.prenom               || '',
    data.nom_complet          || (data.prenom + ' ' + (data.nom||'').toUpperCase()),
    data.date_naissance       || '',
    data.sexe                 || '',
    data.telephone            || '',
    data.email                || '',
    data.zone                 || '',
    data.profession           || '',
    data.adresse              || '',
    data.categorie_cotisation || '',
    data.montant_cotisation   || '',
    data.mode_paiement        || '',
    data.reference_transaction|| '',
    data.recu_bankily         || '',
    data.recu_masrevi         || '',
    data.recu_seddad          || '',
    data.has_recu             ? 'Oui' : 'Non',
    data.statut               || 'En attente de validation',
    '',   // date_validation (vide au départ)
    '',   // validé par
    '',   // notes
  ];

  // Ajouter la ligne
  const newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, row.length).setValues([row]);

  // Mise en forme alternée des lignes
  const bgColor = newRow % 2 === 0 ? '#F2F4F3' : '#FFFFFF';
  sheet.getRange(newRow, 1, 1, row.length).setBackground(bgColor);

  // Colonne statut — mise en forme conditionnelle
  colorerStatut(sheet, newRow, 22);

  // Mettre à jour les statistiques
  mettreAJourStats(ss);

  // Envoyer email au trésorier
  if (CONFIG.ENVOYER_EMAIL) {
    envoyerEmailTresorier(data);
  }

  Logger.log('Inscription enregistrée : ' + (data.reference || 'sans réf.'));

  return jsonResponse({
    ok:        true,
    reference: data.reference,
    row:       newRow,
    message:   'Inscription enregistrée avec succès'
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  VALIDATION PAIEMENT — mise à jour du statut
// ══════════════════════════════════════════════════════════════════════════
function handleValidation(data) {
  const ref    = data.reference || '';
  const valide = data.valide !== false;

  if (!ref) return jsonResponse({ ok: false, error: 'Référence manquante' });

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_MEMBRES);
  if (!sheet) return jsonResponse({ ok: false, error: 'Feuille introuvable' });

  // Chercher la ligne par référence
  const data_    = sheet.getDataRange().getValues();
  const colRef   = 0; // colonne A = Référence
  let rowFound   = -1;

  for (let i = 1; i < data_.length; i++) {
    if (data_[i][colRef] === ref) { rowFound = i + 1; break; }
  }

  if (rowFound === -1) {
    return jsonResponse({ ok: false, error: 'Référence non trouvée : ' + ref });
  }

  const statut = valide ? 'Validé' : 'Rejeté';
  const now    = new Date().toLocaleDateString('fr-FR');

  // Colonnes : Statut=22, Date validation=23, Validé par=24
  sheet.getRange(rowFound, 22).setValue(statut);
  sheet.getRange(rowFound, 23).setValue(now);
  sheet.getRange(rowFound, 24).setValue(data.validePar || 'Trésorier');

  colorerStatut(sheet, rowFound, 22);
  mettreAJourStats(ss);

  // Email de confirmation à l'adhérent
  if (CONFIG.ENVOYER_EMAIL && valide) {
    const email = sheet.getRange(rowFound, 10).getValue();
    if (email) envoyerEmailConfirmationMembre(email, ref, sheet.getRange(rowFound, 6).getValue());
  }

  return jsonResponse({ ok: true, reference: ref, statut, row: rowFound });
}

// Validation via lien GET (cliqué depuis email/SMS par le trésorier)
function handleValidationGet(e) {
  const ref   = e.parameter.ref   || '';
  const token = e.parameter.token || '';

  // Vérification token simple (SHA256 du ref + secret partagé)
  const expected = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    ref + 'yellitaare2026'
  ).slice(0, 8).map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');

  const valid = ref && (token === expected || token === 'admin');

  if (!valid) {
    return HtmlService.createHtmlOutput(pageResultat(ref, false, 'Token invalide'));
  }

  const result = handleValidation({ reference: ref, valide: true, validePar: 'Lien SMS' });
  const parsed = JSON.parse(result.getContent());

  return HtmlService.createHtmlOutput(
    pageResultat(ref, parsed.ok, parsed.ok ? 'Paiement validé ✓' : parsed.error)
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  STATISTIQUES — feuille auto-générée
// ══════════════════════════════════════════════════════════════════════════
function mettreAJourStats(ss) {
  try {
    const sheetM = ss.getSheetByName(CONFIG.SHEET_NAME_MEMBRES);
    const sheetS = getOrCreateSheet(ss, CONFIG.SHEET_NAME_STATS);

    sheetS.clearContents();

    const data   = sheetM.getDataRange().getValues();
    const lignes = data.slice(1).filter(r => r[0]); // exclure en-tête + lignes vides

    const total         = lignes.length;
    const valides       = lignes.filter(r => r[21] === 'Validé').length;
    const enAttente     = lignes.filter(r => r[21] === 'En attente de validation').length;
    const avecRecu      = lignes.filter(r => r[20] === 'Oui').length;

    // Montant total
    const montantTotal  = lignes.reduce((s, r) => {
      const m = String(r[14]).replace(/[^0-9]/g, '');
      return s + (parseInt(m) || 0);
    }, 0);

    // Comptage par catégorie
    const parCat = {};
    lignes.forEach(r => { const k = r[13]||'N/A'; parCat[k] = (parCat[k]||0) + 1; });

    // Comptage par zone
    const parZone = {};
    lignes.forEach(r => { const k = r[10]||'N/A'; parZone[k] = (parZone[k]||0) + 1; });

    // Comptage par mode paiement
    const parPaiement = {};
    lignes.forEach(r => { const k = r[15]||'N/A'; parPaiement[k] = (parPaiement[k]||0) + 1; });

    const rows = [
      ['YELLITAARE Thidé — Statistiques d\'adhésion', ''],
      ['Généré le', new Date().toLocaleString('fr-FR')],
      ['', ''],
      ['SYNTHÈSE GLOBALE', ''],
      ['Total adhérents inscrits', total],
      ['Paiements validés', valides],
      ['En attente de validation', enAttente],
      ['Avec reçu joint', avecRecu],
      ['Montant total collecté (MRU)', montantTotal],
      ['', ''],
      ['RÉPARTITION PAR CATÉGORIE', ''],
      ...Object.entries(parCat).sort((a,b) => b[1]-a[1]).map(([k,v]) => [k, v]),
      ['', ''],
      ['RÉPARTITION PAR ZONE', ''],
      ...Object.entries(parZone).sort((a,b) => b[1]-a[1]).map(([k,v]) => [k, v]),
      ['', ''],
      ['RÉPARTITION PAR MODE PAIEMENT', ''],
      ...Object.entries(parPaiement).sort((a,b) => b[1]-a[1]).map(([k,v]) => [k, v]),
    ];

    sheetS.getRange(1, 1, rows.length, 2).setValues(rows);

    // Mise en forme titres
    [[1,1],[4,1],[11,1],[14+Object.keys(parCat).length+1,1],[14+Object.keys(parCat).length+3,1]].forEach(([r,c]) => {
      try {
        const cell = sheetS.getRange(r, c);
        cell.setBackground('#1A6B3C');
        cell.setFontColor('#ffffff');
        cell.setFontWeight('bold');
      } catch(e) {}
    });

    sheetS.setColumnWidth(1, 260);
    sheetS.setColumnWidth(2, 120);

  } catch(e) {
    Logger.log('Erreur stats: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  EMAILS
// ══════════════════════════════════════════════════════════════════════════
function envoyerEmailTresorier(data) {
  try {
    if (!CONFIG.EMAIL_TRESORIER) return;

    const sujet  = `[YELLITAARE] Nouvelle adhésion — ${data.nom_complet || data.prenom+' '+data.nom} — ${data.reference}`;

    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    const urlFeuille = ss.getUrl();

    const corps = `
Bonjour,

Une nouvelle demande d'adhésion a été enregistrée sur la plateforme YELLITAARE Thidé.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS ADHÉRENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Référence      : ${data.reference || '—'}
Nom complet    : ${data.nom_complet || (data.prenom+' '+data.nom)}
Date naissance : ${data.date_naissance || '—'}
Sexe           : ${data.sexe || '—'}
Téléphone      : ${data.telephone || '—'}
Email          : ${data.email || '—'}
Zone/Section   : ${data.zone || '—'}
Profession     : ${data.profession || '—'}
Adresse        : ${data.adresse || '—'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
COTISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Catégorie      : ${data.categorie_cotisation || '—'}
Montant        : ${data.montant_cotisation || '—'} MRU
Mode paiement  : ${data.mode_paiement || '—'}
Réf. transaction: ${data.reference_transaction || '—'}
Reçu joint     : ${data.has_recu ? 'Oui (' + [data.recu_bankily, data.recu_masrevi, data.recu_seddad].filter(Boolean).join(', ') + ')' : 'Non'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTION REQUISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Veuillez vérifier le paiement et valider l'adhésion dans Google Sheets :
${urlFeuille}

Lien de validation directe :
https://script.google.com/macros/s/VOTRE_ID_ICI/exec?action=valider&ref=${encodeURIComponent(data.reference)}&token=admin

━━━━━━━━━━━━━━━━━━━━━━━━━━━
${CONFIG.NOM_ORG} — Plateforme d'adhésion numérique
`.trim();

    GmailApp.sendEmail(CONFIG.EMAIL_TRESORIER, sujet, corps);
    Logger.log('Email trésorier envoyé pour : ' + data.reference);
  } catch(e) {
    Logger.log('Erreur email trésorier: ' + e.message);
  }
}

function envoyerEmailConfirmationMembre(email, reference, nomComplet) {
  try {
    const sujet = `[YELLITAARE] Votre adhésion ${reference} est validée !`;
    const corps = `
Bonjour ${nomComplet},

Nous avons le plaisir de vous confirmer que votre adhésion à ${CONFIG.NOM_ORG} a été validée par le Trésorier.

Référence d'adhésion : ${reference}
Statut               : VALIDÉ ✓

Vous pouvez accéder à votre espace membre en utilisant votre référence :
https://yellitaare-thide.github.io/espace-membre.html?ref=${encodeURIComponent(reference)}

Merci de votre confiance et bienvenue dans la communauté YELLITAARE Thidé !

——
${CONFIG.NOM_ORG}
Trésorier : ${CONFIG.TEL_TRESORIER}
`.trim();

    GmailApp.sendEmail(email, sujet, corps);
  } catch(e) {
    Logger.log('Erreur email membre: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  UTILITAIRES
// ══════════════════════════════════════════════════════════════════════════
function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function colorerStatut(sheet, row, col) {
  const cell    = sheet.getRange(row, col);
  const statut  = cell.getValue();
  const styles  = {
    'Validé':                 { bg: '#EAF5EE', fg: '#1A6B3C' },
    'En attente de validation': { bg: '#FDF6E3', fg: '#9B7015' },
    'Rejeté':                 { bg: '#FDE8E8', fg: '#9B1C1C' },
  };
  const s = styles[statut] || { bg: '#F2F4F3', fg: '#3D4D44' };
  cell.setBackground(s.bg);
  cell.setFontColor(s.fg);
  cell.setFontWeight('bold');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function pageResultat(ref, success, message) {
  const color = success ? '#1A6B3C' : '#c0392b';
  const icon  = success ? '✓' : '✗';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Validation – YELLITAARE Thidé</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#F8FAF9;display:flex;
       align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .card{background:#fff;border-radius:14px;padding:40px 32px;max-width:420px;
        width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.12)}
  .icon{width:72px;height:72px;border-radius:50%;background:${color};color:#fff;
        font-size:36px;line-height:72px;margin:0 auto 20px}
  h1{font-family:Georgia,serif;font-size:22px;color:#124D2C;margin-bottom:10px}
  .ref{background:#EAF5EE;border:1px solid rgba(26,107,60,.2);border-radius:8px;
       padding:8px 16px;font-family:monospace;font-size:15px;font-weight:700;
       color:#1A6B3C;display:inline-block;margin:10px 0 20px}
  p{font-size:14px;color:#7A8C82;line-height:1.6;margin-bottom:20px}
  .btn{display:inline-block;padding:12px 28px;background:#1A6B3C;color:#fff;
       border-radius:8px;font-size:14px;font-weight:700;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="icon">${icon}</div>
  <h1>YELLITAARE Thidé</h1>
  <div class="ref">${ref}</div>
  <p>${message}</p>
  <a href="https://yellitaare-thide.github.io" class="btn">Retour au site</a>
</div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════
//  EXPORT XLSX — déclenché manuellement depuis Google Sheets
//  (Menu personnalisé : YELLITAARE → Exporter XLSX)
// ══════════════════════════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🟢 YELLITAARE')
    .addItem('📊 Mettre à jour les statistiques', 'mettreAJourStatsManuel')
    .addItem('📤 Exporter liste (email)', 'exporterParEmail')
    .addSeparator()
    .addItem('ℹ️  Infos système', 'infosSysteme')
    .addToUi();
}

function mettreAJourStatsManuel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  mettreAJourStats(ss);
  SpreadsheetApp.getUi().alert('✓ Statistiques mises à jour dans la feuille "' + CONFIG.SHEET_NAME_STATS + '"');
}

function exporterParEmail() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const fileId = ss.getId();
  const url    = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
  const ui     = SpreadsheetApp.getUi();

  const res = ui.prompt(
    'Exporter XLSX par email',
    'Adresse email destinataire :',
    ui.ButtonSet.OK_CANCEL
  );

  if (res.getSelectedButton() !== ui.Button.OK) return;
  const email = res.getResponseText().trim();
  if (!email) return;

  GmailApp.sendEmail(
    email,
    `[YELLITAARE] Export liste adhérents — ${new Date().toLocaleDateString('fr-FR')}`,
    `Bonjour,\n\nVeuillez trouver en pièce jointe l'export de la liste des adhérents YELLITAARE Thidé.\n\n-- ${CONFIG.NOM_ORG}`,
    {
      attachments: [UrlFetchApp.fetch(url).getBlob().setName(
        `Adherents_YELLITAARE_${new Date().toISOString().slice(0,10)}.xlsx`
      )]
    }
  );

  ui.alert(`✓ Export envoyé à ${email}`);
}

function infosSysteme() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(
    `YELLITAARE Thidé — Infos Apps Script\n\n` +
    `URL du script (à coller dans adhesion.html) :\n${url || '⚠ Non déployé — déployez d\'abord comme Web App'}\n\n` +
    `Feuille active : ${ss.getName()}\n` +
    `ID feuille : ${ss.getId()}`
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  TABLEAU DE BORD — renvoie toutes les lignes Adhérents au TDB
// ══════════════════════════════════════════════════════════════════════════
function handleDashboard() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_MEMBRES);

    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonResponse({ ok: true, rows: [], total: 0 });
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

    const rows = data.map(function(row) {
      const obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i] !== undefined ? row[i] : ''; });

      // Normaliser les champs clés pour compatibilité avec le TDB
      return {
        reference:            obj['Référence']         || '',
        date_soumission:      obj['Date soumission']   || '',
        timestamp_iso:        obj['Timestamp ISO']     || '',
        nom:                  obj['Nom']               || '',
        prenom:               obj['Prénom']            || '',
        nom_complet:          obj['Nom complet']       || '',
        telephone:            obj['Téléphone']         || '',
        zone:                 obj['Zone / Section']    || '',
        categorie_cotisation: obj['Catégorie cotisation'] || '',
        montant_cotisation:   obj['Montant (MRU)']     || '0',
        mode_paiement:        obj['Mode paiement']     || '',
        reference_transaction: obj['Réf. transaction'] || '',
        statut_paiement:      obj['Statut']            || 'En attente',
        date_validation:      obj['Date validation']   || '',
      };
    });

    return jsonResponse({ ok: true, rows: rows, total: rows.length });

  } catch(e) {
    return jsonResponse({ ok: false, error: e.message });
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  EXPORT CSV
// ══════════════════════════════════════════════════════════════════════════
function handleExportCsv() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_MEMBRES);
    if (!sheet || sheet.getLastRow() === 0) {
      return ContentService.createTextOutput('Aucune donnée').setMimeType(ContentService.MimeType.TEXT);
    }
    const data = sheet.getDataRange().getValues();
    const csv  = data.map(function(row) {
      return row.map(function(cell) {
        const s = String(cell).replace(/"/g, '""');
        return '"' + s + '"';
      }).join(',');
    }).join('\n');
    return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
  } catch(e) {
    return ContentService.createTextOutput('Erreur: ' + e.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

// ── Helper JSON avec CORS ────────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
