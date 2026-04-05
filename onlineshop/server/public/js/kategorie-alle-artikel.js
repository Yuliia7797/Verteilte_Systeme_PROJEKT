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

/*
  Diese Funktion liest die Kategorie-ID aus der URL aus.
  Beispiel: kategorie.html?id=2
*/
function getKategorieIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/*
  Diese Funktion sucht den Namen der aktuellen Kategorie
  und setzt damit die Überschrift der Seite sowie den Seitentitel.
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

/*
  Diese Funktion erstellt die HTML-Karten
  für alle Artikel der ausgewählten Kategorie.
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
          <!-- Klick auf das Bild führt zur Artikeldetailseite -->
          <a href="/static/artikel.html?id=${artikelItem.id}">
            <img src="${artikelItem.bild_url}" alt="${artikelItem.bezeichnung}">
          </a>

          <div class="card-body">
            <!-- Klick auf den Artikelnamen führt ebenfalls zur Detailseite -->
            <h5 class="card-title">
              <a href="/static/artikel.html?id=${artikelItem.id}" class="text-decoration-none text-dark">
                ${artikelItem.bezeichnung}
              </a>
            </h5>

            <!-- Kurze Artikelbeschreibung -->
            <p class="card-text">${artikelItem.beschreibung || ''}</p>

            <!-- Preis mit zwei Nachkommastellen -->
            <p class="fw-bold">${Number(artikelItem.preis).toFixed(2)} €</p>

            <!-- Button zum Hinzufügen in den Warenkorb -->
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

/*
  Diese Funktion zeigt eine Fehlermeldung
  direkt im Artikel-Container an.
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

/*
  Diese Funktion lädt:
  1. die Kategorien, um den Namen der aktuellen Kategorie zu finden
  2. die Artikel dieser Kategorie, um sie auf der Seite anzuzeigen
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

/*
  Diese Funktion behandelt Klicks auf die
  "In den Warenkorb"-Buttons in der Kategorieansicht.
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
    } catch (jsonError) {
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

/*
  Warten, bis die HTML-Seite vollständig geladen ist.
  Erst danach sollen die Artikel der ausgewählten Kategorie geladen werden.
*/
document.addEventListener('DOMContentLoaded', loadKategorieArtikel);