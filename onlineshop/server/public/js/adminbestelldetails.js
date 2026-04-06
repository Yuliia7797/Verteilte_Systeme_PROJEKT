/*
  Datei: adminbestelldetails.js
  Beschreibung: Diese Datei steuert die Detailseite einer einzelnen Bestellung
    im Admin-Bereich. Sie prüft beim Laden der Seite den Admin-Zugriff, liest
    die Bestell-ID aus der URL, lädt die Bestelldaten vom Backend und zeigt
    allgemeine Informationen, Lieferadresse und Positionen an.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js sowie die
    zentrale Formatierungslogik aus format.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

// Lädt die Bestelldetails nach dem Aufbau des DOM
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
    await ladeBestelldetails();
  } catch (fehler) {
    console.error('Fehler bei der Initialisierung der Bestelldetails:', fehler);
  }
});

/**
 * Liest die Bestell-ID aus der URL, lädt die zugehörigen Bestelldaten
 * vom Server und zeigt allgemeine Informationen, Lieferadresse
 * sowie Bestellpositionen auf der Seite an.
 *
 * @async
 * @function ladeBestelldetails
 * @returns {Promise<void>}
 */
async function ladeBestelldetails() {
  const bestellungInfo = document.getElementById('bestellung-info');
  const lieferadresseInfo = document.getElementById('lieferadresse-info');
  const positionenTabelle = document.getElementById('positionen-tabelle');

  const bestellungId = getQueryParam('id');

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
    const antwort = await fetch(`/bestellung/${bestellungId}`, {
      credentials: 'same-origin'
    });
    const daten = await antwort.json();

    if (!antwort.ok) {
      throw new Error('Fehler beim Laden der Bestelldetails.');
    }

    const bestellung = daten.bestellung;
    const positionen = daten.positionen;

    bestellungInfo.innerHTML = `
      <p><strong>Bestell-ID:</strong> ${bestellung.id ?? '-'}</p>
      <p><strong>Kunde:</strong> ${bestellung.vorname ?? '-'} ${bestellung.nachname ?? '-'}</p>
      <p><strong>E-Mail:</strong> ${bestellung.email ?? '-'}</p>
      <p><strong>Gesamtpreis:</strong> ${formatPreis(bestellung.gesamtpreis)}</p>
      <p><strong>Zahlungsmethode:</strong> ${bestellung.zahlungsmethode ?? '-'}</p>
      <p><strong>Zahlungsstatus:</strong> ${bestellung.zahlungsstatus ?? '-'}</p>
      <p><strong>Bestellstatus:</strong> ${bestellung.bestellstatus ?? '-'}</p>
      <p class="mb-0"><strong>Erstellt am:</strong> ${formatDatumMitUhrzeit(bestellung.erstellungszeitpunkt)}</p>
    `;

    lieferadresseInfo.innerHTML = `
      <p><strong>Straße:</strong> ${bestellung.strasse ?? '-'} ${bestellung.hausnummer ?? ''}</p>
      <p><strong>Postleitzahl / Ort:</strong> ${bestellung.postleitzahl ?? '-'} ${bestellung.ort ?? '-'}</p>
      <p class="mb-0"><strong>Land:</strong> ${bestellung.land ?? '-'}</p>
    `;

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
        <td>${formatPreis(eintrag.einzelpreis)}</td>
        <td>${formatPreis(eintrag.gesamtpreis)}</td>
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