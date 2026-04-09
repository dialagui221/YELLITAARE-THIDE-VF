# Pack GitHub + Excel Online + Power Automate

Contenu :
- `index.html` : site web adapté à Excel Online / Power Automate
- `modele_excel_yellitaare.xlsx` : classeur Excel avec table `AdhesionsTable` et dashboard
- `power_automate_sample_payload.json` : exemple de payload HTTP
- `README_DEPLOIEMENT.md` : procédure de configuration

## Vue d'ensemble
Le site stocke les dossiers en local dans le navigateur puis les envoie vers Power Automate.
Power Automate ajoute chaque dossier dans la table Excel `AdhesionsTable`.
Le dashboard principal se trouve dans le fichier Excel.
