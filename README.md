════════════════════════════════════════════════════════════════════
  YELLITAARE THIDÉ — Plateforme Communautaire
  Package de livraison complet — Version 2.0
════════════════════════════════════════════════════════════════════

FICHIERS INCLUS
───────────────
  index.html               → La plateforme web complète (ouvrir dans un navigateur)
  Code.gs                  → Le script Google Apps Script (backend Google Sheets)
  YELLITAARE_Adhesions.xlsx → Le classeur Google Sheets prêt à l'emploi
  README.txt               → Ce guide

════════════════════════════════════════════════════════════════════
  INSTALLATION EN 6 ÉTAPES
════════════════════════════════════════════════════════════════════

ÉTAPE 1 — Importer le Google Sheet
────────────────────────────────────
  1. Ouvrez drive.google.com
  2. Cliquez Nouveau → Importer un fichier
  3. Importez YELLITAARE_Adhesions.xlsx
  4. Choisissez "Convertir en Google Sheets"
  5. Notez l'ID dans l'URL : docs.google.com/spreadsheets/d/[ID]/edit

ÉTAPE 2 — Installer le script Apps Script
───────────────────────────────────────────
  1. Dans le Google Sheet : Extensions → Apps Script
  2. Supprimez tout le code existant
  3. Copiez-collez intégralement le contenu de Code.gs
  4. Enregistrez (Ctrl+S) → nommez le projet "YELLITAARE-API"

ÉTAPE 3 — Tester le script
────────────────────────────
  1. Dans l'éditeur Apps Script
  2. Sélectionnez la fonction : testScript
  3. Cliquez ▶ Exécuter
  4. Acceptez les autorisations Google demandées
  5. Vérifiez dans "Journaux d'exécution" que ✅ apparaît

ÉTAPE 4 — Déployer
────────────────────
  1. Cliquez Déployer → Nouveau déploiement
  2. Type        : Application Web
  3. Exécuter en : Moi (mon compte)
  4. Accès       : Tout le monde
  5. Cliquez Déployer → Autorisez → COPIEZ L'URL générée
     (format : https://script.google.com/macros/s/XXXX/exec)

ÉTAPE 5 — Connecter la plateforme
───────────────────────────────────
  1. Ouvrez index.html dans votre navigateur
  2. Menu → Administration
  3. Dans "URL Apps Script" → collez l'URL copiée
  4. Cliquez 💾 Sauver URL
  5. Cliquez ↻ Recharger Sheets
  6. L'indicateur doit passer au 🟢 Connecté

ÉTAPE 6 — Synchroniser les données existantes
───────────────────────────────────────────────
  1. Cliquez ☁️ Envoyer → Sheets
  2. Les dossiers en cache local s'envoient vers Google Sheets
  3. Vérifiez que les lignes apparaissent dans l'onglet "Adhésions"

════════════════════════════════════════════════════════════════════
  STRUCTURE DU GOOGLE SHEET
════════════════════════════════════════════════════════════════════

  Onglet "Adhésions"       → Registre principal de tous les adhérents
  Onglet "Tableau de bord" → KPI automatiques (formules dynamiques)
  Onglet "Guide connexion" → Rappel des étapes d'installation

  Colonnes (ordre exact, NE PAS MODIFIER LES NOMS) :
  A  reference              B  date_soumission
  C  nom_complet            D  prenom
  E  nom                    F  sexe
  G  date_naissance         H  telephone
  I  email                  J  profession
  K  adresse                L  zone
  M  categorie_cotisation   N  montant_cotisation
  O  mode_paiement          P  reference_transaction
  Q  statut_paiement

════════════════════════════════════════════════════════════════════
  FONCTIONNALITÉS DE LA PLATEFORME
════════════════════════════════════════════════════════════════════

  ✅ Accueil            → Statistiques en temps réel, sections, agenda
  ✅ Adhésion           → Formulaire multi-étapes avec référence unique
  ✅ Espace membre      → Consultation dossier par référence
  ✅ Médiathèque        → Documents, galerie photos, rapports
  ✅ Commissions        → Gestion des sections et plans d'action
  ✅ Organes            → Bureau, Conseil, Comités
  ✅ TDB Adhésions      → Graphiques, filtres, export Excel
  ✅ Administration     → Gestion membres, sync Google Sheets, diagnostic

════════════════════════════════════════════════════════════════════
  FONCTIONS DU SCRIPT Apps Script (Code.gs)
════════════════════════════════════════════════════════════════════

  doPost(e)               → Reçoit et enregistre une nouvelle adhésion
                            (anti-doublon intégré, formatage automatique)
  doGet(?action=list)     → Retourne tous les membres en JSON/JSONP
  doGet(?action=stats)    → Retourne les statistiques globales
  createHeaders(sheet)    → Crée les en-têtes si feuille vide
  formatDataRow(...)      → Colore les lignes selon le statut
  sendAdminNotification() → Email admin (désactivé — décommenter pour activer)
  testScript()            → Fonction de test à exécuter depuis l'éditeur

════════════════════════════════════════════════════════════════════
  RÉSOLUTION DE PROBLÈMES
════════════════════════════════════════════════════════════════════

  🔴 Indicateur rouge / orange
     → Vérifiez que l'URL commence par https://script.google.com/
     → Vérifiez que le déploiement est en "Tout le monde"
     → Ré-déployez en créant un NOUVEAU déploiement (pas modifier l'ancien)

  🔴 Erreur "Unexpected token 'const'"
     → Dans Apps Script : ⚙️ Paramètres → Activer V8
     → Ou utilisez la version Rhino du code (var au lieu de const/let)

  🔴 Données non reçues dans Sheets
     → Vérifiez le nom de la feuille : doit être exactement "Adhésions"
     → Cliquez 🔧 Diagnostic pour identifier l'erreur précise
     → Consultez les journaux Apps Script (Exécutions → voir logs)

  🔴 Doublon refusé
     → Normal : le script bloque les références déjà enregistrées
     → Supprimez la ligne TEST dans Sheets après le diagnostic

════════════════════════════════════════════════════════════════════
  CONTACT & SUPPORT
════════════════════════════════════════════════════════════════════

  Association YELLITAARE — Village de Thidé, Brakna, Mauritanie
  Plateforme développée pour la gestion communautaire des adhésions
════════════════════════════════════════════════════════════════════
