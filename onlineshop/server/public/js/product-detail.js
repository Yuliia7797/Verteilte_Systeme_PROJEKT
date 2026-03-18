// Produkt-ID aus der URL lesen
function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Einzelnes Produkt vom Backend laden
async function loadProductDetail() {
  try {
    // Produkt-ID aus der URL holen
    const productId = getProductIdFromUrl();

    // Prüfen, ob überhaupt eine ID vorhanden ist
    if (!productId) {
      document.getElementById('product-detail-container').innerHTML = `
        <div class="alert alert-danger">
          Kein Produkt ausgewählt.
        </div>
      `;
      return;
    }

    // Anfrage an das Backend senden
    const response = await fetch(`/products/${productId}`);

    // Prüfen, ob die Antwort erfolgreich war
    if (!response.ok) {
      throw new Error('Produkt konnte nicht geladen werden');
    }

    // Antwort in JSON umwandeln
    const product = await response.json();

    // Verfügbarkeitsstatus berechnen
    const lagerbestand = product.lagerbestand ?? 0;
    const verfuegbarkeitText = lagerbestand > 0 ? 'Auf Lager' : 'Nicht verfügbar';

    // Container holen
    const container = document.getElementById('product-detail-container');

    // Detailansicht für das Produkt erzeugen
    container.innerHTML = `
      <div class="row g-5 align-items-start">
        <div class="col-md-6">
          <!-- Produktbild -->
          <div class="card p-3 shadow-sm">
            <img
              src="${product.bild_url}"
              alt="${product.bezeichnung}"
              class="img-fluid"
            >
          </div>
        </div>

        <div class="col-md-6">
          <!-- Produktname -->
          <h1 class="mb-3">${product.bezeichnung}</h1>

          <!-- Kurze Produktbeschreibung -->
          <p class="lead">${product.beschreibung || ''}</p>

          <!-- Produktpreis -->
          <p class="fs-2 fw-bold mb-4">${Number(product.preis).toFixed(2)} €</p>

          <!-- Zusätzliche Produktinformationen -->
          <div class="mb-4">
            <p class="mb-2"><strong>Artikelnummer:</strong> ${product.id}</p>
            <p class="mb-2"><strong>Kategorie:</strong> ${product.kategorie_name || 'Keine Angabe'}</p>
            <p class="mb-2"><strong>Verfügbarkeit:</strong> ${verfuegbarkeitText}</p>
            <p class="mb-2"><strong>Bestand:</strong> ${lagerbestand} Stück</p>
          </div>

          <a href="#" class="btn btn-main btn-lg mb-4">In den Warenkorb</a>

          <hr>

          <!-- Ausführliche Produktbeschreibung -->
          <h4 class="mb-3">Produktbeschreibung</h4>
          <p>${product.langbeschreibung || 'Keine ausführliche Beschreibung vorhanden.'}</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Fehler beim Laden der Produktdetails:', error);

    document.getElementById('product-detail-container').innerHTML = `
      <div class="alert alert-danger">
        Produktdetails konnten nicht geladen werden.
      </div>
    `;
  }
}

// Produktdetails laden, sobald die Seite fertig geladen ist
document.addEventListener('DOMContentLoaded', loadProductDetail);