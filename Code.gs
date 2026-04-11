// ============================================================
//  YELLITAARE Thidé — Google Apps Script v2
//  ✅ API JSONP pour le TDB
//  ✅ Notifications email à chaque nouvelle adhésion
//  ✅ Résumé hebdomadaire automatique
// ============================================================

var SHEET_NAME = 'Réponses au formulaire 1';

// ── EMAILS DESTINATAIRES ─────────────────────────────────────
// Remplacez par les vrais emails du Bureau Exécutif
var NOTIFICATION_EMAILS = [
  'secretaire.yellitaare@gmail.com',
  'tresorier.yellitaare@gmail.com'
];
var NOTIFICATIONS_ENABLED = true;

// ============================================================
//  doGet
// ============================================================
function doGet(e) {
  var params = e.parameter || {};
  var action = params.action || 'list';
  var callback = params.callback || '';
  try {
    if (action === 'list') return sendResponse(callback, getMembers());
    if (action === 'save') return sendResponse(callback, saveMember(params));
    if (action === 'stats') return sendResponse(callback, getStats());
    return sendResponse(callback, { status: 'error', message: 'Action inconnue' });
  } catch (err) {
    return sendResponse(callback, { status: 'error', message: err.toString() });
  }
}

function getMembers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
           || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0], result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
      row[String(headers[j]).trim()] = val != null ? String(val) : '';
    }
    result.push(row);
  }
  return result;
}

function saveMember(params) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
           || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = headers.map(function(h) {
    var key = String(h).trim();
    if (params[key]) return params[key];
    for (var p in params) { if (p.toLowerCase() === key.toLowerCase()) return params[p]; }
    return '';
  });
  sheet.appendRow(newRow);
  return { status: 'ok' };
}

function getStats() {
  var members = getMembers();
  var valides=0, attente=0, refuses=0, totalMontant=0, ceMois=0;
  var parSection={}, now=new Date();
  members.forEach(function(m) {
    var s = (m['statut_paiement']||m['Statut']||'').toLowerCase();
    if (s.indexOf('valid')!==-1) valides++; else if (s.indexOf('refus')!==-1) refuses++; else attente++;
    var cat = m['Catégorie']||''; var n=cat.replace(/[^\d]/g,''); if(n) totalMontant+=parseInt(n);
    var sec = m['Section']||'Non précisé'; parSection[sec]=(parSection[sec]||0)+1;
    try { var d=new Date(m['Horodateur']||''); if(d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()) ceMois++; } catch(e){}
  });
  return { total:members.length, valides:valides, attente:attente, refuses:refuses, totalMontant:totalMontant, ceMois:ceMois, parSection:parSection };
}

// ============================================================
//  NOTIFICATION EMAIL — Nouvelle adhésion
//  Déclencheur : Édition > Déclencheurs > onFormSubmit
//  > Depuis un formulaire > Lors de l'envoi
// ============================================================
function onFormSubmit(e) {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    var r = e.namedValues || {};
    var nom = gv(r,'Nom'), prenom = gv(r,'Prénom'), tel = gv(r,'Téléphone');
    var section = gv(r,'Section'), categorie = gv(r,'Catégorie'), paiement = gv(r,'Mode de paiement');
    var email = gv(r,'Email');
    var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy à HH:mm');
    var montant = categorie.replace(/[^\d]/g,'') || '—';

    var subject = '🆕 Nouvelle adhésion — ' + prenom + ' ' + nom.toUpperCase() + ' (' + section + ')';

    var htmlBody = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
      '<div style="background:#1A5C2A;padding:24px;border-radius:12px 12px 0 0;">' +
        '<h1 style="color:#fff;margin:0;font-size:20px;">YELLITAARE Thidé</h1>' +
        '<p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px;">Nouvelle demande d\'adhésion</p>' +
      '</div>' +
      '<div style="background:#fff;padding:24px;border:1px solid #E5E7EB;border-top:none;">' +
        '<div style="background:#E8F5E9;border-left:4px solid #1A5C2A;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;">' +
          '<strong style="color:#1A5C2A;font-size:16px;">' + prenom + ' ' + nom.toUpperCase() + '</strong>' +
          '<div style="color:#6B7280;font-size:13px;margin-top:4px;">' + section + ' · ' + date + '</div>' +
        '</div>' +
        rh('Téléphone',tel) + rh('Email',email||'—') + rh('Section',section) +
        rh('Catégorie',categorie) + rh('Montant',montant+' MRU') + rh('Paiement',paiement) +
        rh('Statut','⏳ En attente de validation') +
      '</div>' +
      '<div style="background:#F5F0E8;padding:16px 24px;border-radius:0 0 12px 12px;border:1px solid #E5E7EB;border-top:none;text-align:center;">' +
        '<p style="margin:0;font-size:13px;color:#6B7280;">Connectez-vous au <strong>Tableau de Bord</strong> pour valider ce dossier.</p>' +
      '</div></div>';

    var textBody = 'Nouvelle adhésion : ' + prenom + ' ' + nom.toUpperCase() + '\n' +
      'Section: ' + section + ' | Catégorie: ' + categorie + ' | ' + montant + ' MRU\n' +
      'Tel: ' + tel + ' | Paiement: ' + paiement + '\n' +
      'Date: ' + date + ' | Statut: En attente';

    NOTIFICATION_EMAILS.forEach(function(em) {
      if (em && em.indexOf('@') !== -1) {
        MailApp.sendEmail({ to: em.trim(), subject: subject, body: textBody, htmlBody: htmlBody });
      }
    });
  } catch (err) { Logger.log('Erreur notification: ' + err); }
}

function rh(l,v) {
  return '<div style="display:flex;padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:14px;">' +
    '<span style="color:#6B7280;min-width:120px;font-size:12px;font-weight:600;text-transform:uppercase;">' + l + '</span>' +
    '<span style="color:#1E2D26;font-weight:500;">' + v + '</span></div>';
}

function gv(nv, key) {
  if (nv[key] && nv[key].length) return nv[key][0];
  var keys = Object.keys(nv);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase().indexOf(key.toLowerCase()) !== -1) return nv[keys[i]][0] || '';
  }
  return '';
}

// ============================================================
//  RÉSUMÉ HEBDOMADAIRE
//  Déclencheur : Temporel > Hebdomadaire > Lundi 8h
// ============================================================
function sendWeeklySummary() {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    var stats = getStats();
    var date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy');
    var subject = '📊 Résumé hebdomadaire YELLITAARE — ' + date;
    var sLines = '';
    Object.keys(stats.parSection||{}).forEach(function(s) { sLines += '  • ' + s + ' : ' + stats.parSection[s] + '\n'; });
    var body = 'YELLITAARE THIDÉ — Résumé ' + date + '\n\n' +
      'Total: ' + stats.total + ' | Validés: ' + stats.valides + ' | En attente: ' + stats.attente + ' | Refusés: ' + stats.refuses + '\n' +
      'Cotisations: ' + stats.totalMontant + ' MRU | Ce mois: ' + stats.ceMois + ' nouveau(x)\n\n' +
      'Par section :\n' + sLines;
    NOTIFICATION_EMAILS.forEach(function(em) {
      if (em && em.indexOf('@')!==-1) MailApp.sendEmail({ to:em.trim(), subject:subject, body:body });
    });
  } catch(err) { Logger.log('Erreur résumé: '+err); }
}

function sendResponse(callback, data) {
  var json = JSON.stringify(data);
  return callback
    ? ContentService.createTextOutput(callback+'('+json+')').setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
