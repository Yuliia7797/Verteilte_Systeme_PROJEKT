/**
 * Diese Datei steuert die Admin-Seite für die Bestellverwaltung.
 * Sie lädt alle Bestellungen vom Backend und zeigt sie
 * in einer Tabelle auf der Seite adminbestellungen.html an.
 */

'use strict';

/**
 * Wartet, bis die Seite geladen ist.
 * Danach werden die Bestellungen vom Backend geladen.
 */
document.addEventListener('DOMContentLoaded', () => {
  ladeBestellungen();
});

/**
 * Lädt alle Bestellungen vom Backend und zeigt sie in der Tabelle an.
 */
async function ladeBestellungen() {
  const bestellungenTabelle = document.getElementById('bestellungen-tabelle');

  try {
    const antwort = await fetch('/bestellung');
    const bestellungen = await antwort.json();

    if (!antwort.ok) {
      throw new Error('Fehler beim Laden der Bestellungen.');
    }

    if (!Array.isArray(bestellungen) || bestellungen.length === 0) {
      bestellungenTabelle.innerHTML = `
        <tr>
          <td colspan="9" class="text-center">Keine Bestellungen gefunden.</td>
        </tr>
      `;
      return;
    }

    bestellungenTabelle.innerHTML = '';

    bestellungen.forEach((eintrag) => {
      const zeile = document.createElement('tr');

      const kunde = `${eintrag.vorname ?? ''} ${eintrag.nachname ?? ''}`.trim() || '-';

      zeile.innerHTML = `
        <td>${eintrag.id ?? '-'}</td>
        <td>${kunde}</td>
        <td>${eintrag.email ?? '-'}</td>
        <td>${formatierePreis(eintrag.gesamtpreis)}</td>
        <td>${eintrag.zahlungsmethode ?? '-'}</td>
        <td>${eintrag.zahlungsstatus ?? '-'}</td>
        <td>${eintrag.bestellstatus ?? '-'}</td>
        <td>${formatiereDatum(eintrag.erstellungszeitpunkt)}</td>
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

    bestellungenTabelle.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-danger">
          Bestellungen konnten nicht geladen werden.
        </td>
      </tr>
    `;
  }
}

/**
 * Formatiert ein Datum für eine besser lesbare Anzeige.
 *
 * @param {string|null|undefined} wert - Das Datum aus dem Backend.
 * @returns {string} Formatiertes Datum oder "-".
 */
function formatiereDatum(wert) {
  if (!wert) {
    return '-';
  }

  const datum = new Date(wert);

  if (isNaN(datum.getTime())) {
    return '-';
  }

  return datum.toLocaleString('de-DE');
}

/**
 * Formatiert einen Preis mit zwei Nachkommastellen.
 *
 * @param {number|string|null|undefined} wert - Der Preis aus dem Backend.
 * @returns {string} Formatierter Preis oder "-".
 */
function formatierePreis(wert) {
  if (wert === null || wert === undefined || wert === '') {
    return '-';
  }

  const preis = Number.parseFloat(wert);

  if (Number.isNaN(preis)) {
    return '-';
  }

  return `${preis.toFixed(2)} €`;
}