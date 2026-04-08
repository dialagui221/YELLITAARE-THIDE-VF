// ═══════════════════════════════════════════════════════════════
// YELLITAARE Thidé — Google Apps Script
// À coller dans votre projet Apps Script lié à votre Google Sheets
// Puis : Déployer > Application Web > Accès : Tout le monde
// ═══════════════════════════════════════════════════════════════

const SHEET_NAME = 'Adhésions'; // Nom de l'onglet (à créer dans votre Sheets)

// En-têtes à mettre en ligne 1 de votre feuille :
// reference | date_soumission | nom_complet | prenom | nom | sexe | date_naissance | telephone | email | profession | adresse | zone | categorie_cotisation | montant_cotisation | mode_paiement | reference_transaction | statut_paiement

// ── doGet : Lecture des données (GET) ─────────────────────────
function doGet(e) {
  var params = e.parameter || {};
  var action = params.action || '';
  var callback = params.callback || '';

  if (action === 'list') {
    var data = getAllRows();
    // Support JSONP si callback fourni
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'export' || params.export === 'csv') {
    return exportCSV();
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'YELLITAARE API active. Utilisez ?action=list pour lire les données.'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ── doPost : Réception d'un nouveau membre (POST) ────────────
function doPost(e) {
  try {
    var data = {};

    // Méthode 1 : Données de formulaire (form submit depuis iframe)
    if (e.parameter && e.parameter.reference) {
      data = e.parameter;
    }
    // Méthode 2 : JSON dans le corps (fetch POST)
    else if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch(parseErr) {
        // Si le parse échoue, essayer les paramètres de formulaire
        data = e.parameter || {};
      }
    }

    // Vérification minimum
    if (!data.reference && !data.nom_complet && !data.prenom) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Données insuffisantes'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Vérifier si le membre existe déjà (par référence)
    if (data.reference && memberExists(data.reference)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'duplicate',
        message: 'Ce membre existe déjà : ' + data.reference
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Insérer dans la feuille
    insertRow(data);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Membre enregistré : ' + (data.reference || data.nom_complet || ''),
      reference: data.reference || ''
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Fonctions utilitaires ─────────────────────────────────────

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Créer l'onglet s'il n'existe pas
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = [
      'reference', 'date_soumission', 'nom_complet', 'prenom', 'nom',
      'sexe', 'date_naissance', 'telephone', 'email', 'profession',
      'adresse', 'zone', 'categorie_cotisation', 'montant_cotisation',
      'mode_paiement', 'reference_transaction', 'statut_paiement'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1A5C2A')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getHeaders() {
  var sheet = getSheet();
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function insertRow(data) {
  var sheet = getSheet();
  var headers = getHeaders();
  var row = headers.map(function(h) {
    return data[h] !== undefined ? data[h] : '';
  });

  // Si date_soumission est vide, mettre la date du jour
  var dateIdx = headers.indexOf('date_soumission');
  if (dateIdx >= 0 && !row[dateIdx]) {
    row[dateIdx] = Utilities.formatDate(new Date(), 'Africa/Nouakchott', 'dd/MM/yyyy');
  }

  // Si statut_paiement est vide, mettre "En attente"
  var statutIdx = headers.indexOf('statut_paiement');
  if (statutIdx >= 0 && !row[statutIdx]) {
    row[statutIdx] = 'En attente';
  }

  sheet.appendRow(row);

  // Formater la ligne ajoutée
  var lastRow = sheet.getLastRow();
  var montantIdx = headers.indexOf('montant_cotisation');
  if (montantIdx >= 0) {
    sheet.getRange(lastRow, montantIdx + 1).setNumberFormat('#,##0');
  }
}

function memberExists(reference) {
  var sheet = getSheet();
  var headers = getHeaders();
  var refIdx = headers.indexOf('reference');
  if (refIdx < 0) return false;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][refIdx] === reference) return true;
  }
  return false;
}

function getAllRows() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Seulement les en-têtes

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }

  return result;
}

function exportCSV() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var csv = data.map(function(row) {
    return row.map(function(cell) {
      return '"' + String(cell).replace(/"/g, '""') + '"';
    }).join(',');
  }).join('\n');

  return ContentService.createTextOutput('\uFEFF' + csv)
    .setMimeType(ContentService.MimeType.CSV);
}
