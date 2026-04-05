/*
  Datei: kategorie-alle-artikel.js
  Beschreibung: Diese Datei steuert die Artikelübersicht einer einzelnen Kategorie.
    Beim Laden der Seite wird die Kategorie-ID aus dem URL-Parameter ausgelesen.
    Anschließend werden zwei GET-Requests an das Backend gesendet:
    1. Alle Kategorien laden, um den Namen der aktuellen Kategorie als Seitenüberschrift zu setzen.
    2. Alle Artikel der ausgewählten Kategorie laden und als Cards im Container anzeigen.
    Jede Card zeigt Bild, Name, Kurzbeschreibung und Preis und verlinkt auf die Detailseite.
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
 * @param {string} kategorieId - Aktuelle Kategorie-ID aus der URL
 */
function setKategorieTitel(kategorien, kategorieId) {
  const titleElement = document.getElementById('kategorie-title');

  if (!titleElement) {
    console.error('Das Element mit der ID "kategorie-title" wurde nicht gefunden.');
    return;
  }

  const aktuelleKategorie = kategorien.find(
    kategorie => String(kategorie.id) === String(kategorieId)
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
 * Rendert alle Artikel der ausgewählten Kategorie
 * als Karten im Container.
 *
 * @function renderKategorieArtikel
 * @param {Array<Object>} artikel - Liste der Artikel
 */
function renderKategorieArtikel(artikel) {
  const container = document.getElementById('kategorie-artikel-container');

  if (!container) {
    console.error('Der Container mit der ID "kategorie-artikel-container" wurde nicht gefunden.');
    return;
  }

  container.innerHTML = '';

  if (artikel.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <p class="text-center">Keine Artikel in dieser Kategorie gefunden.</p>
      </div>
    `;
    return;
  }

  artikel.forEach(artikelItem => {
    const istVerfuegbar = (artikelItem.lagerbestand ?? 0) > 0;

    const card = `
      <div class="col-md-4">
        <div class="card h-100">
          <a href="/static/artikel.html?id=${artikelItem.id}">
            <img src="${artikelItem.bild_url}" alt="${artikelItem.bezeichnung}">
          </a>

          <div class="card-body">
            <h5 class="card-title">
              <a href="/static/artikel.html?id=${artikelItem.id}" class="text-decoration-none text-dark">
                ${artikelItem.bezeichnung}
              </a>
            </h5>

            <p class="card-text">${artikelItem.beschreibung || ''}</p>

            <p class="fw-bold">${Number(artikelItem.preis).toFixed(2)} €</p>

            <button
              type="button"
              class="btn btn-main js-in-warenkorb"
              data-artikel-id="${artikelItem.id}"
              data-lagerbestand="${artikelItem.lagerbestand ?? 0}"
              style="${!istVerfuegbar ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
            >
              ${istVerfuegbar ? 'In den Warenkorb' : 'Nicht verfügbar'}
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML += card;
  });
}

/**
 * Zeigt eine Fehlermeldung im Artikel-Container an.
 *
 * @function renderKategorieArtikelFehler
 * @param {string} message - Anzuzeigende Fehlermeldung
 */
function renderKategorieArtikelFehler(message) {
  const container = document.getElementById('kategorie-artikel-container');

  if (!container) {
    console.error('Der Container mit der ID "kategorie-artikel-container" wurde nicht gefunden.');
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
 * Lädt die Kategorien und die Artikel der ausgewählten Kategorie
 * und rendert die Seite entsprechend.
 *
 * @async
 * @function loadKategorieArtikel
 * @returns {Promise<void>}
 */
async function loadKategorieArtikel() {
  try {
    const kategorieId = getKategorieIdFromUrl();

    if (!kategorieId) {
      renderKategorieArtikelFehler('Keine Kategorie ausgewählt.');
      return;
    }

    const kategorienResponse = await fetch('/kategorien');

    if (!kategorienResponse.ok) {
      throw new Error('Kategorien konnten nicht geladen werden');
    }

    const kategorien = await kategorienResponse.json();
    setKategorieTitel(kategorien, kategorieId);

    const artikelResponse = await fetch(`/artikel?kategorie_id=${kategorieId}`);

    if (!artikelResponse.ok) {
      throw new Error('Artikel der Kategorie konnten nicht geladen werden');
    }

    const artikel = await artikelResponse.json();
    renderKategorieArtikel(artikel);

  } catch (error) {
    console.error('Fehler beim Laden der Kategorie-Artikel:', error);
    renderKategorieArtikelFehler('Die Artikel dieser Kategorie konnten nicht geladen werden.');
  }
}

/**
 * Behandelt Klicks auf "In den Warenkorb"-Buttons
 * und fügt Artikel dem Warenkorb hinzu.
 *
 * @async
 * @param {MouseEvent} event - Klickereignis im Dokument
 * @returns {Promise<void>}
 */
document.addEventListener('click', async (event) => {
  const button = event.target.closest('.js-in-warenkorb');

  if (!button) {
    return;
  }

  const lagerbestand = Number(button.dataset.lagerbestand) || 0;

  if (lagerbestand <= 0) {
    alert('Dieser Artikel ist momentan nicht verfügbar.');
    return;
  }

  const artikelId = Number.parseInt(button.dataset.artikelId, 10);

  if (!Number.isInteger(artikelId)) {
    alert('Ungültige Artikel-ID.');
    return;
  }

  try {
    button.disabled = true;

    const response = await fetch('/warenkorb/positionen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        artikel_id: artikelId,
        anzahl: 1
      })
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      alert('Bitte melde dich an, um Artikel in den Warenkorb zu legen.');
      weiterleiten('/static/login.html');
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Hinzufügen zum Warenkorb');
    }

    alert(data.message || 'Artikel wurde zum Warenkorb hinzugefügt.');
  } catch (error) {
    console.error('Fehler beim Hinzufügen zum Warenkorb:', error);
    alert(error.message || 'Serverfehler beim Hinzufügen zum Warenkorb.');
  } finally {
    button.disabled = false;
  }
});

/**
 * Lädt die Artikel der ausgewählten Kategorie,
 * nachdem das DOM vollständig aufgebaut ist.
 */
document.addEventListener('DOMContentLoaded', loadKategorieArtikel);