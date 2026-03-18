// Funktion zum Laden aller Produkte von der API
async function loadProducts() {
  try {
    // Anfrage an das Backend senden
    // Die Route /products liefert alle Produkte als JSON zurück
    const response = await fetch('/products');

    // Antwort in JSON umwandeln
    const products = await response.json();

    // Den leeren Container aus der HTML-Seite holen
    const container = document.getElementById('products-container');

    // Sicherheitshalber alten Inhalt löschen,
    // damit keine doppelten Karten angezeigt werden
    container.innerHTML = '';

    // Über alle Produkte aus der Datenbank laufen
    products.forEach(product => {
      // Für jedes Produkt eine HTML-Karte erstellen
      // Die Daten kommen direkt aus der Datenbank:
      // bild_url, bezeichnung, beschreibung, preis
      const card = `
        <div class="col-md-4">
          <div class="card h-100">
            <!-- Klick auf das Bild führt zur Produktdetailseite -->
            <a href="/static/produkt.html?id=${product.id}">
              <img src="${product.bild_url}" alt="${product.bezeichnung}">
            </a>

            <div class="card-body">
              <!-- Klick auf den Produktnamen führt ebenfalls zur Detailseite -->
              <h5 class="card-title">
                <a href="/static/produkt.html?id=${product.id}" class="text-decoration-none text-dark">
                  ${product.bezeichnung}
                </a>
              </h5>

              <!-- Produktbeschreibung -->
              <p class="card-text">${product.beschreibung}</p>

              <!-- Preis mit zwei Nachkommastellen -->
              <p class="fw-bold">${Number(product.preis).toFixed(2)} €</p>

              <!-- Später kann hier die Warenkorb-Funktion ergänzt werden -->
              <a href="#" class="btn btn-main">In den Warenkorb</a>
            </div>
          </div>
        </div>
      `;

      // Die erzeugte Karte in den Container einfügen
      container.innerHTML += card;
    });

  } catch (error) {
    // Falls beim Laden etwas schiefgeht, Fehler in der Konsole anzeigen
    console.error('Fehler beim Laden der Produkte:', error);
  }
}

// Warten, bis die komplette HTML-Seite geladen ist
// Erst danach sollen die Produkte eingefügt werden
document.addEventListener('DOMContentLoaded', loadProducts);