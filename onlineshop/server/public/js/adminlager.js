/*
  Datei: adminlager.js
  Beschreibung: Diese Datei steuert die Verwaltung des Lagerbestands im Admin-Bereich.
    Sie prüft beim Laden der Seite den Admin-Zugriff und ermöglicht das Bearbeiten
    und Anzeigen des Lagerbestands.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Startet die Initialisierung der Seite nach dem Laden des DOM.
 *
 * @function
 * @returns {void}
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
    await ladeLagerbestand();
  } catch (fehler) {
    console.error('Fehler bei der Initialisierung des Lagerbestands:', fehler);
  }
});

/**
 * Lädt den aktuellen Lagerbestand vom Server und zeigt ihn in der Tabelle an.
 * Ermöglicht das Bearbeiten und Speichern einzelner Bestände.
 *
 * @function ladeLagerbestand
 * @returns {Promise<void>}
 */
async function ladeLagerbestand() {
  const tbody = document.getElementById('lagerbestand-tabelle');

  try {
    const response = await fetch('/lagerbestand');
    const daten = await response.json();

    console.log('Geladene Lagerdaten:', daten);

    tbody.innerHTML = '';

    if (!Array.isArray(daten) || daten.length === 0) {
      renderTableEmpty(tbody, 5, 'Keine Lagerdaten vorhanden.');
      return;
    }

    daten.forEach((eintrag) => {
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

          await ladeLagerbestand();
          alert('Lagerbestand erfolgreich gespeichert.');
        } catch (fehler) {
          console.error('Fehler beim Speichern:', fehler);
          alert('Der Lagerbestand konnte nicht gespeichert werden.');
        }
      });
    });
  } catch (fehler) {
    console.error('Fehler beim Laden des Lagerbestands:', fehler);
    renderTableError(tbody, 5, 'Der Lagerbestand konnte nicht geladen werden.');
  }
}