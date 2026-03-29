// Wenn die Seite geöffnet ist, wird zuerst der Zugriff geprüft
document.addEventListener('DOMContentLoaded', () => {
  pruefeAdminZugriff();
});

// Prüft, ob ein Benutzer eingeloggt ist und die Rolle "admin" hat
async function pruefeAdminZugriff() {
  try {
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    // Wenn keine aktive Session vorhanden ist, zur Login-Seite weiterleiten
    if (!response.ok) {
      window.location.href = 'login.html';
      return;
    }

    const benutzer = await response.json();

    // Wenn der Benutzer kein Admin ist, zurück zur Startseite weiterleiten
    if (benutzer.rolle !== 'admin') {
      window.location.href = 'index.html';
      return;
    }

    // Nur Admins dürfen den Lagerbestand laden
    ladeLagerbestand();
  } catch (fehler) {
    console.error('Fehler bei der Prüfung des Admin-Zugriffs:', fehler);
    window.location.href = 'login.html';
  }
}

// Holt die Lagerdaten vom Server
async function ladeLagerbestand() {
  try {
    const response = await fetch('/lagerbestand');
    const daten = await response.json();

    console.log('Geladene Lagerdaten:', daten);

    const tbody = document.getElementById('lagerbestand-tabelle');

    // Alte Tabelleninhalte löschen
    tbody.innerHTML = '';

    // Für jeden Artikel eine neue Zeile erstellen
    daten.forEach(eintrag => {
      const zeile = document.createElement('tr');

      zeile.innerHTML = `
        <td>${eintrag.artikel_id}</td>
        <td>${eintrag.artikel}</td>
        <td>${eintrag.anzahl}</td>
        <td>
          <input type="number" class="form-control" value="${eintrag.anzahl}" min="0">
        </td>
        <td>
          <button class="btn btn-primary btn-sm">Speichern</button>
        </td>
      `;

      // Zeile in die Tabelle einfügen
      tbody.appendChild(zeile);

      // Eingabefeld und Button aus der aktuellen Zeile holen
      const inputFeld = zeile.querySelector('input');
      const speichernButton = zeile.querySelector('button');

      // Beim Klick wird der neue Lagerbestand gespeichert
      speichernButton.addEventListener('click', async () => {
        const neuerBestand = parseInt(inputFeld.value, 10);

        // Prüfen, ob die Eingabe gültig ist
        if (isNaN(neuerBestand) || neuerBestand < 0) {
          alert('Bitte eine gültige Anzahl eingeben.');
          return;
        }

        try {
          const response = await fetch(`/lagerbestand/${eintrag.artikel_id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              anzahl: neuerBestand
            })
          });

          if (!response.ok) {
            throw new Error('Fehler beim Speichern des Lagerbestands.');
          }

          // Tabelle nach dem Speichern neu laden
          ladeLagerbestand();

          alert('Lagerbestand erfolgreich gespeichert.');
        } catch (fehler) {
          console.error('Fehler beim Speichern:', fehler);
          alert('Der Lagerbestand konnte nicht gespeichert werden.');
        }
      });
    });
  } catch (fehler) {
    console.error('Fehler beim Laden des Lagerbestands:', fehler);
  }
}