/*
  Datei: adminbenutzer.js
  Beschreibung: Diese Datei steuert die Benutzerverwaltung im Admin-Bereich.
    Sie prüft den Admin-Zugriff, lädt alle registrierten Benutzer
    und ermöglicht das Anlegen neuer Benutzer mit einer Rolle.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js
    sowie die zentrale Formatierungslogik aus format.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 16.04.2026
*/

'use strict';

// Initialisiert die Seite nach dem Laden des DOM
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
    await ladeBenutzer();
  } catch (fehler) {
    console.error('Fehler bei der Initialisierung des Admin-Bereichs:', fehler);
    return;
  }

  const abbrechenButton = document.getElementById('abbrechen-button');
  const neuerBenutzerButton = document.getElementById('neuer-benutzer-button');
  const benutzerFormular = document.getElementById('benutzer-formular');

  // Abbrechen: Formular ausblenden und zurücksetzen
  if (abbrechenButton) {
    abbrechenButton.addEventListener('click', () => {
      document.getElementById('benutzer-formular-bereich').style.display = 'none';
      document.getElementById('benutzer-formular').reset();
    });
  }

  // Neuer Benutzer: Formular einblenden und zum Formular scrollen
  if (neuerBenutzerButton) {
    neuerBenutzerButton.addEventListener('click', () => {
      document.getElementById('benutzer-formular-bereich').style.display = 'block';
      document.getElementById('benutzer-formular').reset();

      document.getElementById('benutzer-formular-bereich').scrollIntoView({
        behavior: 'smooth'
      });
    });
  }

  // Formular-Submit: Neuen Benutzer mit Rolle per POST anlegen
  if (benutzerFormular) {
    benutzerFormular.addEventListener('submit', async (event) => {
      event.preventDefault();

      // Formulardaten auslesen und bereinigen
      const vorname = document.getElementById('vorname').value.trim();
      const nachname = document.getElementById('nachname').value.trim();
      const email = document.getElementById('email').value.trim();
      const passwort = document.getElementById('passwort').value;
      const rolle = document.getElementById('rolle').value;

      try {
        const response = await fetch('/benutzer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vorname,
            nachname,
            email,
            passwort,
            rolle
          })
        });

        const daten = await response.json();

        if (!response.ok) {
          throw new Error(daten.message || 'Fehler beim Anlegen des Benutzers.');
        }

        document.getElementById('benutzer-formular-bereich').style.display = 'none';
        benutzerFormular.reset();

        await ladeBenutzer();
        alert('Benutzer erfolgreich angelegt.');
      } catch (fehler) {
        console.error('Fehler beim Anlegen des Benutzers:', fehler);
        alert(fehler.message || 'Der Benutzer konnte nicht angelegt werden.');
      }
    });
  }
});

/**
 * Lädt alle Benutzer vom Server und zeigt sie in der Tabelle an.
 * Die Adressdaten werden zu einem lesbaren Text zusammengefügt.
 *
 * @async
 * @function ladeBenutzer
 * @returns {Promise<void>}
 */
async function ladeBenutzer() {
  const tbody = document.getElementById('benutzer-tabelle');

  try {
    const response = await fetch('/benutzer');
    const daten = await response.json();

    console.log('Geladene Benutzer:', daten);

    tbody.innerHTML = '';

    if (!Array.isArray(daten) || daten.length === 0) {
      renderTableEmpty(tbody, 6, 'Keine Benutzer vorhanden.');
      return;
    }

    daten.forEach((benutzer) => {
      const zeile = document.createElement('tr');

      zeile.innerHTML = `
        <td>${benutzer.id}</td>
        <td>${escapeHtml(`${benutzer.vorname} ${benutzer.nachname}`)}</td>
        <td>${escapeHtml(benutzer.email)}</td>
        <td>${escapeHtml(benutzer.rolle)}</td>
        <td>${escapeHtml(formatiereAdresse(benutzer))}</td>
        <td>${formatiereDatum(benutzer.erstellungszeitpunkt)}</td>
      `;

      tbody.appendChild(zeile);
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Benutzer:', fehler);
    renderTableError(tbody, 6, 'Die Benutzer konnten nicht geladen werden.');
  }
}

/**
 * Formatiert die Adressdaten eines Benutzers zu einem lesbaren Text.
 * Falls keine Adresse vorhanden ist, wird ein Platzhalter angezeigt.
 *
 * @function formatiereAdresse
 * @param {Object} benutzer - Benutzerobjekt mit optionalen Adressfeldern
 * @returns {string}
 */
function formatiereAdresse(benutzer) {
  if (!benutzer.strasse || !benutzer.hausnummer || !benutzer.postleitzahl || !benutzer.ort || !benutzer.land) {
    return 'Keine Adresse hinterlegt';
  }

  const adresszeile1 = `${benutzer.strasse} ${benutzer.hausnummer}`;
  const adresszeile2 = benutzer.adresszusatz ? `, ${benutzer.adresszusatz}` : '';
  const adresszeile3 = `${benutzer.postleitzahl} ${benutzer.ort}`;
  const adresszeile4 = benutzer.land;

  return `${adresszeile1}${adresszeile2}, ${adresszeile3}, ${adresszeile4}`;
}

/**
 * Formatiert ein Datum für die Anzeige in der Tabelle.
 * Falls kein Datum vorhanden ist, wird ein Platzhalter zurückgegeben.
 *
 * @function formatiereDatum
 * @param {string} datumWert - Zeitstempel aus der Datenbank
 * @returns {string}
 */
function formatiereDatum(datumWert) {
  if (!datumWert) {
    return '-';
  }

  const datum = new Date(datumWert);

  if (Number.isNaN(datum.getTime())) {
    return datumWert;
  }

  return datum.toLocaleString('de-DE');
}

/**
 * Maskiert HTML-Sonderzeichen, damit Inhalte sicher in der Tabelle
 * angezeigt werden können.
 *
 * @function escapeHtml
 * @param {string} wert - Zu maskierender Text
 * @returns {string}
 */
function escapeHtml(wert) {
  if (wert === null || wert === undefined) {
    return '';
  }

  return String(wert)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}