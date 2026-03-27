/**
 * Diese Datei steuert die Detailansicht eines einzelnen Artikels.
 * Die geladenen Daten (Bild, Name, Beschreibung, Preis, Lagerbestand, Kategorie)
 * werden dynamisch als HTML in den Detailcontainer der Seite eingefügt.
 * Bei fehlender ID oder einem Serverfehler wird eine Fehlermeldung angezeigt.
 */

/*
  Diese Funktion liest die Artikel-ID aus der URL aus.
  Beispiel: artikel.html?id=3
*/
function getArtikelIdFromUrl() {
  /* URL-Parameter der aktuellen Seite lesen */
  const params = new URLSearchParams(window.location.search);

  /* Den Wert des Parameters "id" zurückgeben */
  return params.get('id');
}

/*
  Diese Funktion zeigt eine Fehlermeldung
  direkt im Detail-Container an.
*/
function renderArtikelDetailFehler(message) {
  /* Den Container für die Artikeldetails holen */
  const container = document.getElementById('artikel-detail-container');

  /* Prüfen, ob der Container im HTML existiert */
  if (!container) {
    console.error('Der Container mit der ID "artikel-detail-container" wurde nicht gefunden.');
    return;
  }

  /* Fehlermeldung im Container anzeigen */
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
  /* Den Container für die Artikeldetails holen */
  const container = document.getElementById('artikel-detail-container');

  /* Prüfen, ob der Container im HTML existiert */
  if (!container) {
    console.error('Der Container mit der ID "artikel-detail-container" wurde nicht gefunden.');
    return;
  }

  /* 
    Lagerbestand aus dem Artikel lesen.
    Falls kein Lagerbestand vorhanden ist, wird 0 verwendet.
  */
  const lagerbestand = artikel.lagerbestand ?? 0;

  /* 
    Text für die Verfügbarkeit berechnen.
    Wenn der Bestand größer als 0 ist, ist der Artikel verfügbar.
  */
  const verfuegbarkeitText = lagerbestand > 0 ? 'Auf Lager' : 'Nicht verfügbar';

  /* 
    HTML für die Detailansicht des Artikels erzeugen.
    Angezeigt werden Bild, Name, Beschreibung, Preis und Zusatzinformationen.
  */
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

        <!-- Button für spätere Warenkorb-Funktion -->
        <a href="#" class="btn btn-main btn-lg mb-4">In den Warenkorb</a>

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
    /* Die Artikel-ID aus der URL lesen */
    const artikelId = getArtikelIdFromUrl();

    /* Prüfen, ob überhaupt eine ID vorhanden ist */
    if (!artikelId) {
      renderArtikelDetailFehler('Kein Artikel ausgewählt.');
      return;
    }

    /* 
      Anfrage an das Backend senden,
      um die Daten des ausgewählten Artikels zu laden.
    */
    const response = await fetch(`/artikel/${artikelId}`);

    /* Prüfen, ob die Serverantwort erfolgreich war */
    if (!response.ok) {
      throw new Error('Artikel konnte nicht geladen werden');
    }

    /* Die Antwort in JSON umwandeln */
    const artikel = await response.json();

    /* Die Detailansicht des Artikels im Container anzeigen */
    renderArtikelDetail(artikel);

  } catch (error) {
    /* Fehlermeldung in der Konsole anzeigen */
    console.error('Fehler beim Laden der Artikeldetails:', error);

    /* Zusätzlich eine sichtbare Fehlermeldung im HTML anzeigen */
    renderArtikelDetailFehler('Artikeldetails konnten nicht geladen werden.');
  }
}

/*
  Warten, bis die HTML-Seite vollständig geladen ist.
  Erst danach sollen die Artikeldetails geladen werden.
*/
document.addEventListener('DOMContentLoaded', loadArtikelDetail);