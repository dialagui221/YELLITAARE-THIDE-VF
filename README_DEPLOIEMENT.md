# Procédure rapide

## 1. Publier le site sur GitHub Pages
1. Créez un dépôt GitHub.
2. Déposez `index.html` à la racine.
3. Activez GitHub Pages depuis `main` / `(root)`.

## 2. Préparer Excel Online
1. Ouvrez `modele_excel_yellitaare.xlsx` dans OneDrive ou SharePoint.
2. Vérifiez que le tableau s'appelle bien `AdhesionsTable`.
3. Ne changez pas les noms des colonnes.

## 3. Créer le flux Power Automate
1. `Create` → `Instant cloud flow` ou `Automated cloud flow`
2. Choisissez le déclencheur **When an HTTP request is received**
3. Collez le contenu de `power_automate_sample_payload.json` comme exemple de schéma
4. Ajoutez l'action **Add a row into a table**
5. Sélectionnez le fichier Excel `modele_excel_yellitaare.xlsx`
6. Sélectionnez la table `AdhesionsTable`
7. Faites le mapping champ → colonne avec le même nom

## 4. Récupérer l'URL du flux
1. Enregistrez le flux
2. Copiez l'URL HTTPS générée du déclencheur HTTP

## 5. Brancher le site
1. Ouvrez le site
2. Allez dans Administration
3. Collez l'URL du flux dans `URL Power Automate`
4. Cliquez `Sauver URL`
5. Faites un test d'adhésion
6. Cliquez `Synchroniser vers Excel`

## 6. Vérification
- Le site doit afficher `Excel / Power Automate prêt`
- Une nouvelle ligne doit apparaître dans `AdhesionsTable`
- Le dashboard Excel doit se mettre à jour

## Colonnes attendues
reference
date_soumission
nom_complet
prenom
nom
sexe
date_naissance
telephone
email
profession
adresse
zone
categorie_cotisation
montant_cotisation
mode_paiement
reference_transaction
statut_paiement
section
source
created_at
