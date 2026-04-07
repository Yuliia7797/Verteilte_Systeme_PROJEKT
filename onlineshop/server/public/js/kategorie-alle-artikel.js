/*
  Datei: kategorie-alle-artikel.js
  Beschreibung: Diese Datei steuert die Artikelübersicht einer einzelnen Kategorie.
    Beim Laden der Seite wird die Kategorie-ID aus dem URL-Parameter ausgelesen.
    Anschließend werden zwei GET-Requests an das Backend gesendet:
    1. Alle Kategorien laden, um den Namen der aktuellen Kategorie als Seitenüberschrift zu setzen.
    2. Alle Artikel der ausgewählten Kategorie laden und im Container anzeigen.
    Das Rendern der einzelnen Karten erfolgt über zentrale Komponenten.
    Zusätzlich kann jeder Artikel per Button in den Warenkorb gelegt werden.
    Bei fehlender Kategorie-ID, leerem Ergebnis oder einem Serverfehler wird eine entsprechende Fehlermeldung im Container angezeigt.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Liest die Kategorie-ID aus der URL.
 *
 * @function getKategorieIdFromUrl
 * @returns {string|null} Kategorie-ID oder null
 */
function getKategorieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * Setzt den Namen der aktuellen Kategorie als Seitenüberschrift
 * und aktualisiert zusätzlich den Seitentitel.
 *
 * @function setKategorieTitel
 * @param {Array<Object>} kategorien - Liste aller Kategorien
 * @param {string} kategorieId - Kategorie-ID aus der URL
 * @returns {void}
 */
function setKategorieTitel(kategorien, kategorieId) {
  const titleElement = document.getElementById('kategorie-title');

  if (!titleElement) {
    console.error('Das Element mit der ID "kategorie-title" wurde nicht gefunden.');
    return;
  }

  const aktuelleKategorie = kategorien.find(
    (kategorie) => String(kategorie.id) === String(kategorieId)
  );

  if (aktuelleKategorie) {
    titleElement.textContent = aktuelleKategorie.bezeichnung;
    document.title = `${aktuelleKategorie.bezeichnung} - MyShop`;
  } else {
    titleElement.textContent = 'Kategorie';
    document.title = 'Kategorie - MyShop';
  }
}

/**
 * Zeigt eine Fehlermeldung im Artikel-Container an.
 *
 * @function renderKategorieArtikelFehler
 * @param {string} message - Anzuzeigende Fehlermeldung
 * @returns {void}
 */
function renderKategorieArtikelFehler(message) {
  const container = document.getElementById('kategorie-artikel-container');

  if (!container) {
    console.error('Container nicht gefunden.');
    return;
  }

  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">${message}</div>
    </div>
  `;
}

/**
 * Lädt Kategorien und Artikel der ausgewählten Kategorie und rendert die Seite.
 *
 * @async
 * @function ladeKategorieArtikel
 * @returns {Promise<void>}
 */
async function ladeKategorieArtikel() {
  try {
    const kategorieId = getKategorieIdFromUrl();

    if (!kategorieId) {
      renderKategorieArtikelFehler('Keine Kategorie ausgewählt.');
      return;
    }

    const kategorien = await window.apiGet('/kategorien');
    setKategorieTitel(kategorien, kategorieId);

    const artikel = await window.apiGet(`/artikel?kategorie_id=${kategorieId}`);

    window.renderArtikelListe('kategorie-artikel-container', artikel, {
      leerText: 'Keine Artikel in dieser Kategorie gefunden.'
    });

  } catch (error) {
    console.error('Fehler:', error);
    renderKategorieArtikelFehler('Fehler beim Laden.');
  }
}

/**
 * Initialisiert die Kategorieseite und registriert die Warenkorb-Logik.
 *
 * @async
 * @function initKategorieArtikelSeite
 * @returns {Promise<void>}
 */
async function initKategorieArtikelSeite() {
  await ladeKategorieArtikel();
  window.registriereAddToCartHandler(document);
}

document.addEventListener('DOMContentLoaded', initKategorieArtikelSeite);