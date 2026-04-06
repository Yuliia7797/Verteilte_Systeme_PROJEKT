/*
  Datei: artikel-list.js
  Beschreibung: Diese Datei enthält zentrale Hilfsfunktionen zum Rendern
    von Artikellisten in verschiedenen Bereichen des Frontends.
    Sie leert den Zielcontainer, zeigt bei Bedarf einen Leerzustand an
    und fügt für jeden Artikel eine zentral erzeugte Artikelkarte ein.
    Dadurch wird redundanter Rendering-Code in mehreren Dateien vermieden.
  Hinweise: Verwendet createArtikelCard aus artikel-card.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Rendert einen Leerzustand in einem Artikelcontainer.
 *
 * @function renderLeereArtikelListe
 * @param {HTMLElement} container - Zielcontainer
 * @param {string} [meldung='Keine Artikel gefunden.'] - Anzuzeigende Meldung
 * @returns {void}
 */
function renderLeereArtikelListe(container, meldung = 'Keine Artikel gefunden.') {
  container.innerHTML = `
    <div class="col-12">
      <p class="text-center">${meldung}</p>
    </div>
  `;
}

/**
 * Rendert eine Liste von Artikeln in den angegebenen Container.
 *
 * @function renderArtikelListe
 * @param {string} containerId - ID des Zielcontainers
 * @param {Array<Object>} artikelListe - Liste der Artikel
 * @param {Object} [optionen={}] - Optionale Anzeigeeinstellungen
 * @param {string} [optionen.leerText='Keine Artikel gefunden.'] - Meldung bei leerer Liste
 * @param {boolean} [optionen.zeigeBeschreibung=true] - Ob die Beschreibung angezeigt wird
 * @param {string} [optionen.spaltenKlasse='col-md-4'] - Bootstrap-Spaltenklasse
 * @returns {void}
 */
function renderArtikelListe(containerId, artikelListe, optionen = {}) {
  const {
    leerText = 'Keine Artikel gefunden.',
    zeigeBeschreibung = true,
    spaltenKlasse = 'col-md-4'
  } = optionen;

  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Container mit ID "${containerId}" wurde nicht gefunden.`);
    return;
  }

  container.innerHTML = '';

  if (!Array.isArray(artikelListe) || artikelListe.length === 0) {
    renderLeereArtikelListe(container, leerText);
    return;
  }

  artikelListe.forEach((artikel) => {
    container.innerHTML += window.createArtikelCard(artikel, {
      zeigeBeschreibung,
      spaltenKlasse
    });
  });
}

window.renderLeereArtikelListe = renderLeereArtikelListe;
window.renderArtikelListe = renderArtikelListe;