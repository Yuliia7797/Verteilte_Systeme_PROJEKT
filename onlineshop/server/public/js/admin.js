// Wartet darauf, dass die HTML-Seite vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Nach dem Laden der Seite wird sofort geprüft,
  // ob der aktuelle Benutzer ein Admin ist
  pruefeAdminZugriff();
});

// Diese Funktion prüft, ob ein Benutzer eingeloggt ist
// und ob dieser Benutzer die Rolle "admin" hat
async function pruefeAdminZugriff() {
  try {
    // Anfrage an den Server senden, um die aktuelle Session zu prüfen
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    // Wenn keine gültige Session vorhanden ist,
    // wird der Benutzer zur Login-Seite weitergeleitet
    if (!response.ok) {
      window.location.href = 'login.html';
      return;
    }

    // Die Antwort vom Server in JSON umwandeln
    const benutzer = await response.json();

    // Prüfen, ob der eingeloggte Benutzer die Rolle "admin" hat
    // Wenn nicht, darf er diese Seite nicht öffnen
    if (benutzer.rolle !== 'admin') {
      // Benutzer ohne Admin-Rechte zurück zur Startseite schicken
      window.location.href = 'index.html';
      return;
    }

    // Wenn dieser Punkt erreicht wird,
    // hat der Benutzer Zugriff auf den Admin-Bereich
    console.log('Admin-Zugriff erlaubt.');
  } catch (fehler) {
    // Fehler in der Konsole ausgeben,
    // falls die Session-Prüfung nicht funktioniert
    console.error('Fehler bei der Prüfung des Admin-Zugriffs:', fehler);

    // Bei einem Fehler ebenfalls zur Login-Seite weiterleiten
    window.location.href = 'login.html';
  }
}