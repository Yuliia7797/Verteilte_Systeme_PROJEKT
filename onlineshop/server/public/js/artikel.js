/*
  Datei: artikel.js
  Beschreibung: Diese Datei steuert die Artikelübersicht auf der Startseite des Onlineshops.
    Beim Laden der Seite werden alle verfügbaren Artikel per GET-Request vom Backend geladen
    und dynamisch als Karten (Cards) in den Artikelcontainer der Seite eingefügt.
    Jede Karte zeigt Bild, Name, Kurzbeschreibung und Preis des Artikels an
    und verlinkt auf die zugehörige Detailseite.
    Falls keine Artikel vorhanden sind oder ein Fehler auftritt, wird eine entsprechende Meldung ausgegeben.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Erstellt die HTML-Karte für einen einzelnen Artikel.
 *
 * @function createArtikelCard
 * @param {Object} artikelItem - Artikeldaten aus dem Backend
 * @returns {string} HTML-Markup für die Artikelkarte
 */
function createArtikelCard(artikelItem) {
  const istVerfuegbar = (artikelItem.lagerbestand ?? 0) > 0;

  return `
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
}

/**
 * Rendert alle geladenen Artikel im Container der Startseite.
 * Zeigt bei leerer Liste eine entsprechende Meldung an.
 *
 * @function renderArtikel
 * @param {Array<Object>} artikel - Liste der Artikel
 */
function renderArtikel(artikel) {
  const container = document.getElementById('artikel-container');

  if (!container) {
    console.error('Container "artikel-container" nicht gefunden.');
    return;
  }

  container.innerHTML = '';

  if (artikel.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <p class="text-center">Keine Artikel gefunden.</p>
      </div>
    `;
    return;
  }

  artikel.forEach((artikelItem) => {
    const card = createArtikelCard(artikelItem);
    container.innerHTML += card;
  });
}

/**
 * Lädt alle Artikel vom Server und zeigt sie auf der Startseite an.
 *
 * @async
 * @function loadArtikel
 * @returns {Promise<void>}
 */
async function loadArtikel() {
  try {
    const response = await fetch('/artikel');

    if (!response.ok) {
      throw new Error('Fehler beim Laden der Artikel vom Server');
    }

    const artikel = await response.json();
    renderArtikel(artikel);
  } catch (error) {
    console.error('Fehler beim Laden der Artikel:', error);
  }
}

/**
 * Behandelt Klicks auf den "In den Warenkorb"-Button
 * in der Artikelübersicht und fügt den Artikel dem Warenkorb hinzu.
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
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Hinzufügen zum Warenkorb');
    }

    alert(data.message || 'Artikel wurde hinzugefügt.');
  } catch (error) {
    console.error('Fehler beim Hinzufügen:', error);
    alert(error.message || 'Fehler beim Hinzufügen');
  } finally {
    button.disabled = false;
  }
});

// Lädt die Artikelübersicht nach dem Aufbau des DOM
document.addEventListener('DOMContentLoaded', loadArtikel);