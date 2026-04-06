/*
  Datei: artikel-card.js
  Beschreibung: Diese Datei enthält zentrale Hilfsfunktionen zum Rendern
    einzelner Artikelkarten im Frontend.
    Eine Artikelkarte zeigt Bild, Bezeichnung, Beschreibung, Preis
    und einen Button zum Hinzufügen in den Warenkorb an.
    Dadurch wird redundantes HTML in mehreren Dateien vermieden.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Erstellt den HTML-Link zur Artikeldetailseite.
 *
 * @function getArtikelDetailUrl
 * @param {Object} artikel - Artikeldaten
 * @returns {string} URL zur Detailseite
 */
function getArtikelDetailUrl(artikel) {
  return `/static/artikel.html?id=${artikel.id}`;
}

/**
 * Gibt zurück, ob ein Artikel aktuell verfügbar ist.
 *
 * @function istArtikelVerfuegbar
 * @param {Object} artikel - Artikeldaten
 * @returns {boolean} true bei Bestand > 0, sonst false
 */
function istArtikelVerfuegbar(artikel) {
  return Number(artikel.lagerbestand ?? 0) > 0;
}

/**
 * Erstellt das HTML für den Warenkorb-Button eines Artikels.
 *
 * @function createAddToCartButton
 * @param {Object} artikel - Artikeldaten
 * @returns {string} HTML des Buttons
 */
function createAddToCartButton(artikel) {
  const verfuegbar = istArtikelVerfuegbar(artikel);

  return `
    <button
      type="button"
      class="btn btn-main js-in-warenkorb"
      data-artikel-id="${artikel.id}"
      data-lagerbestand="${artikel.lagerbestand ?? 0}"
      ${!verfuegbar ? 'disabled' : ''}
    >
      ${verfuegbar ? 'In den Warenkorb' : 'Nicht verfügbar'}
    </button>
  `;
}

/**
 * Erstellt das HTML für eine einzelne Artikelkarte.
 *
 * @function createArtikelCard
 * @param {Object} artikel - Artikeldaten aus dem Backend
 * @param {Object} [optionen={}] - Optionale Anzeigeeinstellungen
 * @param {boolean} [optionen.zeigeBeschreibung=true] - Gibt an, ob die Kurzbeschreibung angezeigt werden soll
 * @param {string} [optionen.spaltenKlasse='col-md-4'] - Bootstrap-Spaltenklasse der Karte
 * @returns {string} HTML-Markup der Artikelkarte
 */
function createArtikelCard(artikel, optionen = {}) {
  const {
    zeigeBeschreibung = true,
    spaltenKlasse = 'col-md-4'
  } = optionen;

  const detailUrl = getArtikelDetailUrl(artikel);
  const preisText = typeof window.formatPreis === 'function'
    ? window.formatPreis(artikel.preis)
    : `${Number(artikel.preis).toFixed(2)} €`;

  return `
    <div class="${spaltenKlasse}">
      <div class="card h-100">
        <a href="${detailUrl}">
          <img
            src="${artikel.bild_url}"
            alt="${artikel.bezeichnung}"
          >
        </a>

        <div class="card-body">
          <h5 class="card-title">
            <a href="${detailUrl}" class="text-decoration-none text-dark">
              ${artikel.bezeichnung}
            </a>
          </h5>

          ${zeigeBeschreibung ? `<p class="card-text">${artikel.beschreibung || ''}</p>` : ''}

          <p class="fw-bold">${preisText}</p>

          ${createAddToCartButton(artikel)}
        </div>
      </div>
    </div>
  `;
}

window.getArtikelDetailUrl = getArtikelDetailUrl;
window.istArtikelVerfuegbar = istArtikelVerfuegbar;
window.createAddToCartButton = createAddToCartButton;
window.createArtikelCard = createArtikelCard;