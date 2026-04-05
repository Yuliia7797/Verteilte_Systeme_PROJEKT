/*
  Datei: suche-ergebnisse.js
  Beschreibung: Diese Datei steuert die Suchergebnisseite.
    Der Suchbegriff wird aus dem URL-Parameter ausgelesen, an das Backend gesendet
    und die passenden Artikel werden als Cards angezeigt.
    Bei fehlendem Suchbegriff oder keinen Treffern wird eine entsprechende Meldung ausgegeben.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Liest den Suchbegriff aus der URL.
 *
 * Beispiel: suche.html?q=Harry → "Harry"
 *
 * @function getSuchbegriffFromUrl
 * @returns {string|null} Suchbegriff oder null
 */
function getSuchbegriffFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('q');
}

/**
 * Zeigt den aktuellen Suchbegriff oberhalb der Ergebnisse an.
 * Gibt einen Hinweis aus, wenn kein Suchbegriff vorhanden ist.
 *
 * @function renderSuchbegriff
 * @param {string|null} suchbegriff - Der Suchbegriff aus der URL
 */
function renderSuchbegriff(suchbegriff) {
  const suchbegriffAnzeige = document.getElementById('suchbegriff-anzeige');

  if (!suchbegriffAnzeige) {
    return;
  }

  if (!suchbegriff) {
    suchbegriffAnzeige.textContent = 'Bitte gib einen Suchbegriff ein.';
    return;
  }

  suchbegriffAnzeige.textContent = `Ergebnisse für: "${suchbegriff}"`;
}

/**
 * Erstellt die HTML-Karte für einen gefundenen Artikel.
 *
 * @function createSuchArtikelCard
 * @param {Object} artikelItem - Artikeldaten
 * @returns {string} HTML-Markup der Karte
 */
function createSuchArtikelCard(artikelItem) {
  return `
    <div class="col-md-4">
      <div class="card h-100">
        <a href="/static/artikel.html?id=${artikelItem.id}">
          <img
            src="${artikelItem.bild_url}"
            alt="${artikelItem.bezeichnung}"
            class="card-img-top"
          >
        </a>

        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${artikelItem.bezeichnung}</h5>
          <p class="card-text">${artikelItem.beschreibung || ''}</p>
          <p class="fw-bold mt-auto">${Number(artikelItem.preis).toFixed(2)} €</p>

          <a href="/static/artikel.html?id=${artikelItem.id}" class="btn btn-main">
            Zum Artikel
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Rendert alle gefundenen Artikel im Ergebnis-Container.
 * Zeigt eine Meldung an, wenn keine Treffer vorhanden sind.
 *
 * @function renderSuchergebnisse
 * @param {Array<Object>} artikelListe - Liste der gefundenen Artikel
 */
function renderSuchergebnisse(artikelListe) {
  const container = document.getElementById('suche-artikel-container');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!artikelListe || artikelListe.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <p class="text-center">Keine passenden Artikel gefunden.</p>
      </div>
    `;
    return;
  }

  artikelListe.forEach((artikelItem) => {
    container.innerHTML += createSuchArtikelCard(artikelItem);
  });
}

/**
 * Zeigt eine Fehlermeldung im Ergebnisbereich an.
 *
 * @function renderSucheFehler
 * @param {string} fehlermeldung - Fehlermeldungstext
 */
function renderSucheFehler(fehlermeldung) {
  const container = document.getElementById('suche-artikel-container');

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger text-center">
        ${fehlermeldung}
      </div>
    </div>
  `;
}

/**
 * Lädt die Suchergebnisse vom Backend anhand des URL-Suchbegriffs
 * und zeigt sie auf der Seite an.
 *
 * @async
 * @function loadSuchergebnisse
 * @returns {Promise<void>}
 */
async function loadSuchergebnisse() {
  try {
    const suchbegriff = getSuchbegriffFromUrl();

    renderSuchbegriff(suchbegriff);

    if (!suchbegriff) {
      renderSucheFehler('Kein Suchbegriff wurde übergeben.');
      return;
    }

    const response = await fetch(`/artikel?suche=${encodeURIComponent(suchbegriff)}`);

    if (!response.ok) {
      throw new Error('Suchergebnisse konnten nicht geladen werden');
    }

    const artikelListe = await response.json();

    renderSuchergebnisse(artikelListe);
  } catch (error) {
    console.error('Fehler beim Laden der Suchergebnisse:', error);
    renderSucheFehler('Die Suchergebnisse konnten nicht geladen werden.');
  }
}

/**
 * Startet das Laden der Suchergebnisse,
 * sobald das DOM vollständig geladen ist.
 */
document.addEventListener('DOMContentLoaded', loadSuchergebnisse);