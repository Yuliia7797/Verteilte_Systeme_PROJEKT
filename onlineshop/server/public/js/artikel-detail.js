/*
  Datei: artikel-detail.js
  Beschreibung: Diese Datei steuert die Detailansicht eines einzelnen Artikels.
    Die geladenen Daten (Bild, Name, Beschreibung, Preis, Lagerbestand, Kategorie)
    werden dynamisch als HTML in den Detailcontainer der Seite eingefügt.
    Zusätzlich kann der Artikel über einen Button in den Warenkorb gelegt werden.
    Bei fehlender ID oder einem Serverfehler wird eine Fehlermeldung angezeigt.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Liest die Artikel-ID aus der URL (z. B. artikel.html?id=3).
 *
 * @function getArtikelIdFromUrl
 * @returns {string|null} Artikel-ID oder null
 */
function getArtikelIdFromUrl() {
  return getQueryParam('id');
}

/**
 * Zeigt eine Fehlermeldung im Detail-Container an.
 *
 * @function renderArtikelDetailFehler
 * @param {string} message - Fehlermeldung
 * @returns {void}
 */
function renderArtikelDetailFehler(message) {
  const container = document.getElementById('artikel-detail-container');

  if (!container) {
    console.error('Container "artikel-detail-container" nicht gefunden.');
    return;
  }

  zeigeFehler('artikel-detail-container', message);
}

/**
 * Rendert die Detailansicht eines Artikels in den Container.
 *
 * @function renderArtikelDetail
 * @param {Object} artikel - Artikeldaten vom Backend
 * @returns {void}
 */
function renderArtikelDetail(artikel) {
  const container = document.getElementById('artikel-detail-container');

  if (!container) {
    console.error('Container "artikel-detail-container" nicht gefunden.');
    return;
  }

  const lagerbestand = artikel.lagerbestand ?? 0;
  const istVerfuegbar = lagerbestand > 0;
  const verfuegbarkeitText = istVerfuegbar ? 'Auf Lager' : 'Nicht verfügbar';

  container.innerHTML = `
    <div class="row g-5 align-items-start">
      <div class="col-md-6">
        <div class="card p-3 shadow-sm">
          <img
            src="${artikel.bild_url}"
            alt="${artikel.bezeichnung}"
            class="img-fluid"
          >
        </div>
      </div>

      <div class="col-md-6">
        <h1 class="mb-3">${artikel.bezeichnung}</h1>

        <p class="lead">${artikel.beschreibung || ''}</p>

        <p class="fs-2 fw-bold mb-4">
          ${Number(artikel.preis).toFixed(2)} €
        </p>

        <div class="mb-4">
          <p class="mb-2"><strong>Artikelnummer:</strong> ${artikel.id}</p>
          <p class="mb-2"><strong>Kategorie:</strong> ${artikel.kategorie_name || 'Keine Angabe'}</p>
          <p class="mb-2"><strong>Verfügbarkeit:</strong> ${verfuegbarkeitText}</p>
          <p class="mb-2"><strong>Bestand:</strong> ${lagerbestand} Stück</p>
        </div>

        <button
          type="button"
          class="btn btn-main btn-lg mb-4 js-in-warenkorb"
          data-artikel-id="${artikel.id}"
          data-lagerbestand="${lagerbestand}"
          style="${!istVerfuegbar ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
        >
          ${istVerfuegbar ? 'In den Warenkorb' : 'Nicht verfügbar'}
        </button>

        <hr>

        <h4 class="mb-3">Artikelbeschreibung</h4>
        <p>${artikel.langbeschreibung || 'Keine ausführliche Beschreibung vorhanden.'}</p>
      </div>
    </div>
  `;
}

/**
 * Lädt die Artikeldaten anhand der ID aus der URL
 * und rendert die Detailansicht.
 *
 * @async
 * @function loadArtikelDetail
 * @returns {Promise<void>}
 */
async function loadArtikelDetail() {
  try {
    const artikelId = getArtikelIdFromUrl();

    if (!artikelId) {
      renderArtikelDetailFehler('Kein Artikel ausgewählt.');
      return;
    }

    const response = await fetch(`/artikel/${artikelId}`);

    if (!response.ok) {
      throw new Error('Artikel konnte nicht geladen werden');
    }

    const artikel = await response.json();
    renderArtikelDetail(artikel);
  } catch (error) {
    console.error('Fehler beim Laden der Artikeldetails:', error);
    renderArtikelDetailFehler('Artikeldetails konnten nicht geladen werden.');
  }
}

/**
 * Initialisiert die Artikeldetailseite und registriert
 * die zentrale Warenkorb-Logik.
 *
 * @async
 * @function initArtikelDetailSeite
 * @returns {Promise<void>}
 */
async function initArtikelDetailSeite() {
  await loadArtikelDetail();

  if (typeof window.registriereAddToCartHandler === 'function') {
    window.registriereAddToCartHandler(document);
  } else {
    console.error('warenkorb-actions.js wurde nicht korrekt geladen.');
  }
}

// Lädt die Artikeldetails nach dem Aufbau des DOM
document.addEventListener('DOMContentLoaded', initArtikelDetailSeite);