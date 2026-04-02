/**
 * Diese Datei steuert die Detailansicht eines einzelnen Artikels.
 * Die geladenen Daten (Bild, Name, Beschreibung, Preis, Lagerbestand, Kategorie)
 * werden dynamisch als HTML in den Detailcontainer der Seite eingefügt.
 * Zusätzlich kann der Artikel über einen Button in den Warenkorb gelegt werden.
 * Bei fehlender ID oder einem Serverfehler wird eine Fehlermeldung angezeigt.
 */

'use strict';

/*
  Diese Funktion liest die Artikel-ID aus der URL aus.
  Beispiel: artikel.html?id=3
*/
function getArtikelIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/*
  Diese Funktion zeigt eine Fehlermeldung
  direkt im Detail-Container an.
*/
function renderArtikelDetailFehler(message) {
  const container = document.getElementById('artikel-detail-container');

  if (!container) {
    console.error('Der Container mit der ID "artikel-detail-container" wurde nicht gefunden.');
    return;
  }

  container.innerHTML = `
    <div class="alert alert-danger">
      ${message}
    </div>
  `;
}

/*
  Diese Funktion erstellt die Detailansicht
  für einen einzelnen Artikel.
*/
function renderArtikelDetail(artikel) {
  const container = document.getElementById('artikel-detail-container');

  if (!container) {
    console.error('Der Container mit der ID "artikel-detail-container" wurde nicht gefunden.');
    return;
  }

  const lagerbestand = artikel.lagerbestand ?? 0;
  const verfuegbarkeitText = lagerbestand > 0 ? 'Auf Lager' : 'Nicht verfügbar';

  container.innerHTML = `
    <div class="row g-5 align-items-start">
      <div class="col-md-6">
        <!-- Artikelbild -->
        <div class="card p-3 shadow-sm">
          <img
            src="${artikel.bild_url}"
            alt="${artikel.bezeichnung}"
            class="img-fluid"
          >
        </div>
      </div>

      <div class="col-md-6">
        <!-- Artikelname -->
        <h1 class="mb-3">${artikel.bezeichnung}</h1>

        <!-- Kurze Artikelbeschreibung -->
        <p class="lead">${artikel.beschreibung || ''}</p>

        <!-- Artikelpreis -->
        <p class="fs-2 fw-bold mb-4">${Number(artikel.preis).toFixed(2)} €</p>

        <!-- Zusätzliche Artikelinformationen -->
        <div class="mb-4">
          <p class="mb-2"><strong>Artikelnummer:</strong> ${artikel.id}</p>
          <p class="mb-2"><strong>Kategorie:</strong> ${artikel.kategorie_name || 'Keine Angabe'}</p>
          <p class="mb-2"><strong>Verfügbarkeit:</strong> ${verfuegbarkeitText}</p>
          <p class="mb-2"><strong>Bestand:</strong> ${lagerbestand} Stück</p>
        </div>

        <!-- Button zum Hinzufügen in den Warenkorb -->
        <button
          type="button"
          class="btn btn-main btn-lg mb-4 js-in-warenkorb"
          data-artikel-id="${artikel.id}"
        >
          In den Warenkorb
        </button>

        <hr>

        <!-- Ausführliche Artikelbeschreibung -->
        <h4 class="mb-3">Artikelbeschreibung</h4>
        <p>${artikel.langbeschreibung || 'Keine ausführliche Beschreibung vorhanden.'}</p>
      </div>
    </div>
  `;
}

/*
  Diese Funktion lädt die Daten eines einzelnen Artikels
  vom Backend und zeigt sie auf der Detailseite an.
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

/*
  Diese Funktion behandelt Klicks auf den
  "In den Warenkorb"-Button der Detailseite.
*/
document.addEventListener('click', async (event) => {
  const button = event.target.closest('.js-in-warenkorb');

  if (!button) {
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
  Erst danach sollen die Artikeldetails geladen werden.
*/
document.addEventListener('DOMContentLoaded', loadArtikelDetail);