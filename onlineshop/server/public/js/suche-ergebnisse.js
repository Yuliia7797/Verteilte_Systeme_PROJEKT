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
 * Setzt den Suchbegriff sichtbar auf der Seite.
 *
 * @function setSuchbegriffAnzeige
 * @param {string} suchbegriff - Suchbegriff aus der URL
 * @returns {void}
 */
function setSuchbegriffAnzeige(suchbegriff) {
  const el = document.getElementById('suchbegriff-anzeige');

  if (!el) return;

  el.textContent = suchbegriff
    ? `Ergebnisse für: "${suchbegriff}"`
    : 'Kein Suchbegriff angegeben.';
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
  if (!container) return;

  container.innerHTML = `<div class="alert alert-danger">${message}</div>`;
}

/**
 * Lädt die Suchergebnisse vom Server und rendert sie.
 *
 * @async
 * @function ladeSuchergebnisse
 * @returns {Promise<void>}
 */
async function ladeSuchergebnisse() {
  try {
    const q = getSuchbegriffFromUrl();
    setSuchbegriffAnzeige(q);

    if (!q) {
      renderSucheFehler('Bitte Suchbegriff eingeben.');
      return;
    }

    const artikel = await window.apiGet(`/artikel/suche?q=${encodeURIComponent(q)}`);

    window.renderArtikelListe('suche-artikel-container', artikel, {
      leerText: 'Keine Treffer gefunden.'
    });

  } catch (error) {
    console.error(error);
    renderSucheFehler('Fehler bei der Suche.');
  }
}

/**
 * Initialisiert die Suchergebnisseite und registriert die Warenkorb-Logik.
 *
 * @async
 * @function initSuche
 * @returns {Promise<void>}
 */
async function initSuche() {
  await ladeSuchergebnisse();
  window.registriereAddToCartHandler(document);
}

document.addEventListener('DOMContentLoaded', initSuche);