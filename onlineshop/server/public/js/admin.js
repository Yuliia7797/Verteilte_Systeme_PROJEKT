/*
  Datei: admin.js
  Beschreibung: Initialisierung und Zugriffsschutz für Admin-Bereich
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/


/**
 * Startet die Zugriffsprüfung, sobald das DOM geladen ist.
 *
 * @function
 */
document.addEventListener('DOMContentLoaded', () => {
  pruefeAdminZugriff();
});

/**
 * Prüft, ob ein Benutzer eingeloggt ist und Admin-Rechte besitzt.
 * Leitet bei fehlender Berechtigung automatisch weiter.
 *
 * @async
 * @function pruefeAdminZugriff
 * @returns {Promise<void>}
 */
async function pruefeAdminZugriff() {
  try {
    // Session vom Server abrufen
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    // Keine gültige Session → Login-Seite
    if (!response.ok) {
      weiterleiten('login.html');
      return;
    }

    const benutzer = await response.json();

    // Kein Admin → zurück zur Startseite
    if (benutzer.rolle !== 'admin') {
      weiterleiten('index.html');
      return;
    }

    console.log('Admin-Zugriff erlaubt.');
  } catch (fehler) {
    console.error('Fehler bei der Admin-Prüfung:', fehler);

    // Fehler → Login-Seite
    weiterleiten('login.html');
  }
}