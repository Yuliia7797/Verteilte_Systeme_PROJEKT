/*
  Datei: suche.js
  Beschreibung: Diese Datei verarbeitet das Suchformular im Header.
    Wenn der Benutzer einen Suchbegriff eingibt und auf "Suchen" klickt,
    wird er zur Suchseite weitergeleitet. Der Suchbegriff wird als URL-Parameter übergeben.
    Beispiel: /static/suche.html?q=Harry
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Initialisiert das Suchformular im Header.
 * Registriert den Submit-Handler und leitet zur Suchseite weiter.
 * Verhindert doppelte Initialisierung bei dynamischem Laden.
 *
 * @function initSucheFormular
 */
function initSucheFormular() {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  if (!searchForm || !searchInput) {
    return;
  }

  if (searchForm.dataset.initialized === 'true') {
    return;
  }

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const suchbegriff = searchInput.value.trim();

    if (!suchbegriff) {
      return;
    }

    weiterleiten(`/static/suche.html?q=${encodeURIComponent(suchbegriff)}`);
  });

  searchForm.dataset.initialized = 'true';
}

/**
 * Initialisiert das Suchformular nach dem Laden des DOM.
 */
document.addEventListener('DOMContentLoaded', initSucheFormular);

/**
 * Initialisiert das Suchformular erneut,
 * nachdem dynamische Inhalte (z. B. Header) geladen wurden.
 */
document.addEventListener('includesLoaded', initSucheFormular);