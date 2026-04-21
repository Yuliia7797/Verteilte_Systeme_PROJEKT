/*
  Datei: adminbestellungen.js
  Beschreibung: Diese Datei steuert die Admin-Seite für die Bestellverwaltung.
    Sie prüft beim Laden der Seite den Admin-Zugriff, lädt anschließend alle
    Bestellungen vom Backend und zeigt sie in einer Tabelle an.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js sowie die
    zentrale Formatierungslogik aus format.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

// Lädt die Bestellungen nach dem Aufbau des DOM
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
    await ladeBestellungen();
  } catch (fehler) {
    console.error('Fehler bei der Initialisierung der Bestellverwaltung:', fehler);
  }
});

/**
 * Lädt alle Bestellungen vom Server und zeigt sie in der Tabelle an.
 * Erstellt für jede Bestellung eine Tabellenzeile inklusive Link zur Detailseite.
 *
 * @async
 * @function ladeBestellungen
 * @returns {Promise<void>}
 */
async function ladeBestellungen() {
  const bestellungenTabelle = document.getElementById('bestellungen-tabelle');

  try {
    // Bestellliste vom Backend abrufen
    const antwort = await fetch('/bestellung', {
      credentials: 'same-origin'
    });
    const bestellungen = await antwort.json();

    if (!antwort.ok) {
      throw new Error('Fehler beim Laden der Bestellungen.');
    }

    // Tabelle leeren oder Leer-Zeile anzeigen, wenn keine Bestellungen vorliegen
    if (!Array.isArray(bestellungen) || bestellungen.length === 0) {
      renderTableEmpty(bestellungenTabelle, 9, 'Keine Bestellungen gefunden.');
      return;
    }

    bestellungenTabelle.innerHTML = '';

    // Für jede Bestellung eine Tabellenzeile mit Link zur Detailseite erstellen
    bestellungen.forEach((eintrag) => {
      const zeile = document.createElement('tr');

      // Vor- und Nachname zu einem lesbaren Kundennamen zusammenführen
      const kunde = `${eintrag.vorname ?? ''} ${eintrag.nachname ?? ''}`.trim() || '-';

      zeile.innerHTML = `
        <td>${eintrag.id ?? '-'}</td>
        <td>${kunde}</td>
        <td>${eintrag.email ?? '-'}</td>
        <td>${formatPreis(eintrag.gesamtpreis)}</td>
        <td>${eintrag.zahlungsmethode ?? '-'}</td>
        <td>${eintrag.zahlungsstatus ?? '-'}</td>
        <td>${eintrag.bestellstatus ?? '-'}</td>
        <td>${formatDatumMitUhrzeit(eintrag.erstellungszeitpunkt)}</td>
        <td>
          <a href="adminbestelldetails.html?id=${eintrag.id}" class="btn btn-sm btn-outline-primary">
            Details
          </a>
        </td>
      `;

      bestellungenTabelle.appendChild(zeile);
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Bestellungen:', fehler);
    renderTableError(bestellungenTabelle, 9, 'Bestellungen konnten nicht geladen werden.');
  }
}