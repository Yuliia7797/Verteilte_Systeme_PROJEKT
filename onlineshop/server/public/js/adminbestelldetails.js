/*
  Datei: adminbestelldetails.js
  Beschreibung: Diese Datei steuert die Detailseite einer einzelnen Bestellung
    im Admin-Bereich. Sie liest die Bestell-ID aus der URL, lädt die Bestelldaten
    vom Backend und zeigt allgemeine Informationen, Lieferadresse und Positionen an.
  Hinweise: Lädt Bestelldaten, zeigt Details und Positionen an
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/


'use strict';

/**
 * Wartet, bis die Seite geladen ist.
 * Danach wird die Bestell-ID aus der URL gelesen und die Bestellung geladen.
 */
document.addEventListener('DOMContentLoaded', () => {
  ladeBestelldetails();
});

/**
 * Lädt die Details einer Bestellung anhand der ID aus der URL.
 */
async function ladeBestelldetails() {
  const bestellungInfo = document.getElementById('bestellung-info');
  const lieferadresseInfo = document.getElementById('lieferadresse-info');
  const positionenTabelle = document.getElementById('positionen-tabelle');

  // Bestell-ID aus der URL lesen
  const urlParameter = new URLSearchParams(window.location.search);
  const bestellungId = urlParameter.get('id');

  // Prüfen, ob eine ID vorhanden ist
  if (!bestellungId) {
    bestellungInfo.innerHTML = '<p class="text-danger mb-0">Keine Bestell-ID angegeben.</p>';
    lieferadresseInfo.innerHTML = '<p class="text-danger mb-0">Keine Lieferadresse verfügbar.</p>';
    positionenTabelle.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">Keine Positionsdaten verfügbar.</td>
      </tr>
    `;
    return;
  }

  try {
    const antwort = await fetch(`/bestellung/${bestellungId}`);
    const daten = await antwort.json();

    if (!antwort.ok) {
      throw new Error('Fehler beim Laden der Bestelldetails.');
    }

    const bestellung = daten.bestellung;
    const positionen = daten.positionen;

    // Allgemeine Informationen zur Bestellung anzeigen
    bestellungInfo.innerHTML = `
      <p><strong>Bestell-ID:</strong> ${bestellung.id ?? '-'}</p>
      <p><strong>Kunde:</strong> ${bestellung.vorname ?? '-'} ${bestellung.nachname ?? '-'}</p>
      <p><strong>E-Mail:</strong> ${bestellung.email ?? '-'}</p>
      <p><strong>Gesamtpreis:</strong> ${formatierePreis(bestellung.gesamtpreis)}</p>
      <p><strong>Zahlungsmethode:</strong> ${bestellung.zahlungsmethode ?? '-'}</p>
      <p><strong>Zahlungsstatus:</strong> ${bestellung.zahlungsstatus ?? '-'}</p>
      <p><strong>Bestellstatus:</strong> ${bestellung.bestellstatus ?? '-'}</p>
      <p class="mb-0"><strong>Erstellt am:</strong> ${formatiereDatum(bestellung.erstellungszeitpunkt)}</p>
    `;

    // Lieferadresse anzeigen
    lieferadresseInfo.innerHTML = `
      <p><strong>Straße:</strong> ${bestellung.strasse ?? '-'} ${bestellung.hausnummer ?? ''}</p>
      <p><strong>Postleitzahl / Ort:</strong> ${bestellung.postleitzahl ?? '-'} ${bestellung.ort ?? '-'}</p>
      <p class="mb-0"><strong>Land:</strong> ${bestellung.land ?? '-'}</p>
    `;

    // Bestellpositionen anzeigen
    if (!Array.isArray(positionen) || positionen.length === 0) {
      positionenTabelle.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">Keine Positionen gefunden.</td>
        </tr>
      `;
      return;
    }

    positionenTabelle.innerHTML = '';

    positionen.forEach((eintrag) => {
      const zeile = document.createElement('tr');

      zeile.innerHTML = `
        <td>${eintrag.artikel_id ?? '-'}</td>
        <td>${eintrag.artikel ?? '-'}</td>
        <td>${eintrag.anzahl ?? '-'}</td>
        <td>${formatierePreis(eintrag.einzelpreis)}</td>
        <td>${formatierePreis(eintrag.gesamtpreis)}</td>
      `;

      positionenTabelle.appendChild(zeile);
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Bestelldetails:', fehler);

    bestellungInfo.innerHTML = '<p class="text-danger mb-0">Bestelldaten konnten nicht geladen werden.</p>';
    lieferadresseInfo.innerHTML = '<p class="text-danger mb-0">Lieferadresse konnte nicht geladen werden.</p>';
    positionenTabelle.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">
          Positionsdaten konnten nicht geladen werden.
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