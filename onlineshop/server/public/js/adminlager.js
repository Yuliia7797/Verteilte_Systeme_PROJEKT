/*
  Datei: adminlager.js
  Beschreibung: Diese Datei steuert die Verwaltung des Lagerbestands im Admin-Bereich.
    Sie prüft den Admin-Zugriff und ermöglicht das Bearbeiten
    und Anzeigen des Lagerbestands.
  Hinweise: Prüft Admin-Zugriff, ermöglicht Bearbeiten und Anzeigen des Lagerbestands
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

// Startet die Zugriffsprüfung nach dem Laden des DOM
document.addEventListener('DOMContentLoaded', () => {
  pruefeAdminZugriff();
});

/**
 * Prüft, ob ein Benutzer eingeloggt ist und Admin-Rechte besitzt.
 * Lädt bei Erfolg den Lagerbestand, leitet sonst weiter.
 *
 * @async
 * @function pruefeAdminZugriff
 * @returns {Promise<void>}
 */
async function pruefeAdminZugriff() {
  try {
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      weiterleiten('login.html');
      return;
    }

    const benutzer = await response.json();

    if (benutzer.rolle !== 'admin') {
      weiterleiten('index.html');
      return;
    }

    ladeLagerbestand();
  } catch (fehler) {
    console.error('Fehler bei der Prüfung des Admin-Zugriffs:', fehler);
    weiterleiten('login.html');
  }
}

/**
 * Lädt den aktuellen Lagerbestand vom Server und zeigt ihn in der Tabelle an.
 * Ermöglicht das Bearbeiten und Speichern einzelner Bestände.
 *
 * @async
 * @function ladeLagerbestand
 * @returns {Promise<void>}
 */
async function ladeLagerbestand() {
  try {
    const response = await fetch('/lagerbestand');
    const daten = await response.json();

    console.log('Geladene Lagerdaten:', daten);

    const tbody = document.getElementById('lagerbestand-tabelle');
    tbody.innerHTML = '';

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

      tbody.appendChild(zeile);

      const inputFeld = zeile.querySelector('input');
      const speichernButton = zeile.querySelector('button');

      // Speichert den aktualisierten Lagerbestand eines Artikels
      speichernButton.addEventListener('click', async () => {
        const neuerBestand = parseInt(inputFeld.value, 10);

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