/*
  Datei: suche-ergebnisse.js
  Beschreibung: Diese Datei steuert die Darstellung der Suchergebnisse.
    Beim Laden der Seite wird der Suchbegriff aus dem URL-Parameter ausgelesen.
    Anschließend werden die passenden Artikel per GET-Request vom Backend geladen
    und im Ergebniscontainer angezeigt.
    Das Rendern der einzelnen Karten erfolgt über zentrale Komponenten.
    Zusätzlich kann jeder Artikel per Button in den Warenkorb gelegt werden.
    Bei fehlendem Suchbegriff, leerem Ergebnis oder einem Fehler wird eine passende Meldung ausgegeben.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Liest den Suchbegriff aus der URL.
 *
 * @function getSuchbegriffFromUrl
 * @returns {string} Suchbegriff oder leerer String
 */
function getSuchbegriffFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('q') || '').trim();
}

/**
 * Setzt den Suchbegriff in der Seite als sichtbare Ausgabe.
 *
 * @function setSuchbegriffAnzeige
 * @param {string} suchbegriff - Suchbegriff aus der URL
 * @returns {void}
 */
function setSuchbegriffAnzeige(suchbegriff) {
  const suchbegriffAnzeige = document.getElementById('suchbegriff-anzeige');

  if (!suchbegriffAnzeige) {
    console.error('Das Element mit der ID "suchbegriff-anzeige" wurde nicht gefunden.');
    return;
  }

  if (suchbegriff) {
    suchbegriffAnzeige.textContent = `Ergebnisse für: "${suchbegriff}"`;
    document.title = `Suche: ${suchbegriff} - MyShop`;
  } else {
    suchbegriffAnzeige.textContent = 'Kein Suchbegriff angegeben.';
    document.title = 'Suchergebnisse - MyShop';
  }
}

/**
 * Zeigt eine Fehlermeldung im Suchergebnis-Container an.
 *
 * @function renderSucheFehler
 * @param {string} message - Fehlermeldung
 * @returns {void}
 */
function renderSucheFehler(message) {
  const container = document.getElementById('suche-artikel-container');

  if (!container) {
    console.error('Der Container mit der ID "suche-artikel-container" wurde nicht gefunden.');
    return;
  }

  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">
        ${message}
      </div>
    </div>
  `;
}

/**
 * Lädt die Suchergebnisse vom Server und rendert sie im Container.
 *
 * @async
 * @function ladeSuchergebnisse
 * @returns {Promise<void>}
 */
async function ladeSuchergebnisse() {
  try {
    const suchbegriff = getSuchbegriffFromUrl();
    setSuchbegriffAnzeige(suchbegriff);

    if (!suchbegriff) {
      renderSucheFehler('Bitte gib einen Suchbegriff ein.');
      return;
    }

    const response = await fetch(`/artikel?suche=${encodeURIComponent(suchbegriff)}`);
   
    if (!response.ok) {
      throw new Error('Suchergebnisse konnten nicht geladen werden');
    }

    const artikel = await response.json();

    if (typeof window.renderArtikelListe === 'function') {
      window.renderArtikelListe('suche-artikel-container', artikel, {
        leerText: 'Keine passenden Artikel gefunden.',
        zeigeBeschreibung: true,
        spaltenKlasse: 'col-md-4'
      });
    } else {
      console.error('artikel-list.js wurde nicht korrekt geladen.');
    }
  } catch (error) {
    console.error('Fehler beim Laden der Suchergebnisse:', error);
    renderSucheFehler('Die Suchergebnisse konnten nicht geladen werden.');
  }
}

/**
 * Initialisiert die Suchergebnisseite und registriert
 * die zentrale Warenkorb-Logik.
 *
 * @async
 * @function initSucheErgebnisseSeite
 * @returns {Promise<void>}
 */
async function initSucheErgebnisseSeite() {
  await ladeSuchergebnisse();

  if (typeof window.registriereAddToCartHandler === 'function') {
    window.registriereAddToCartHandler(document);
  } else {
    console.error('warenkorb-actions.js wurde nicht korrekt geladen.');
  }
}

document.addEventListener('DOMContentLoaded', initSucheErgebnisseSeite);