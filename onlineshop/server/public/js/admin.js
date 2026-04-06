/*
  Datei: admin.js
  Beschreibung: Initialisierung und Zugriffsschutz für den Admin-Bereich.
    Beim Laden der Seite wird geprüft, ob ein eingeloggter Benutzer
    mit Admin-Rechten vorhanden ist. Bei fehlender Berechtigung
    erfolgt automatisch eine Weiterleitung.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Startet die Zugriffsprüfung, sobald das DOM geladen ist.
 *
 * @function
 * @returns {void}
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
    console.log('Admin-Zugriff erlaubt.');
  } catch (fehler) {
    console.error('Fehler bei der Admin-Prüfung:', fehler);
  }
});