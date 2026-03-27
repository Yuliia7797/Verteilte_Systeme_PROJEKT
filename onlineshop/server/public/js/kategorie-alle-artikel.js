/**
 * Diese Datei steuert die Artikelübersicht einer einzelnen Kategorie.
 * Beim Laden der Seite wird die Kategorie-ID aus dem URL-Parameter ausgelesen.
 * Anschließend werden zwei GET-Requests an das Backend gesendet:
 * 1. Alle Kategorien laden, um den Namen der aktuellen Kategorie als Seitenüberschrift zu setzen.
 * 2. Alle Artikel der ausgewählten Kategorie laden und als Cards im Container anzeigen.
 * Jede Card zeigt Bild, Name, Kurzbeschreibung und Preis und verlinkt auf die Detailseite.
 * Bei fehlender Kategorie-ID, leerem Ergebnis oder einem Serverfehler wird eine
 * entsprechende Fehlermeldung im Container angezeigt.
 */

/*
  Diese Funktion liest die Kategorie-ID aus der URL aus.
  Beispiel: kategorie.html?id=2
*/
function getKategorieIdFromUrl() {
  /* URL-Parameter der aktuellen Seite lesen */
  const params = new URLSearchParams(window.location.search);

  /* Den Wert des Parameters "id" zurückgeben */
  return params.get('id');
}

/*
  Diese Funktion sucht den Namen der aktuellen Kategorie
  und setzt damit die Überschrift der Seite sowie den Seitentitel.
*/
function setKategorieTitel(kategorien, kategorieId) {
  /* Das HTML-Element für die Überschrift holen */
  const titleElement = document.getElementById('kategorie-title');

  /* Prüfen, ob die Überschrift im HTML existiert */
  if (!titleElement) {
    console.error('Das Element mit der ID "kategorie-title" wurde nicht gefunden.');
    return;
  }

  /* 
    Die Kategorie suchen, deren ID mit der ID aus der URL übereinstimmt.
    String-Vergleich wird verwendet, damit es keine Probleme mit Datentypen gibt.
  */
  const aktuelleKategorie = kategorien.find(
    kategorie => String(kategorie.id) === String(kategorieId)
  );

  /* 
    Falls die Kategorie gefunden wurde,
    wird der Name als Überschrift und als Titel der Browserseite gesetzt.
  */
  if (aktuelleKategorie) {
    titleElement.textContent = aktuelleKategorie.bezeichnung;
    document.title = `${aktuelleKategorie.bezeichnung} - MyShop`;
  } else {
    /* 
      Falls keine passende Kategorie gefunden wurde,
      bleibt ein allgemeiner Titel stehen.
    */
    titleElement.textContent = 'Kategorie';
    document.title = 'Kategorie - MyShop';
  }
}

/*
  Diese Funktion erstellt die HTML-Karten
  für alle Artikel der ausgewählten Kategorie.
*/
function renderKategorieArtikel(artikel) {
  /* Den Container holen, in den die Artikel eingefügt werden sollen */
  const container = document.getElementById('kategorie-artikel-container');

  /* Prüfen, ob der Container im HTML existiert */
  if (!container) {
    console.error('Der Container mit der ID "kategorie-artikel-container" wurde nicht gefunden.');
    return;
  }

  /* Vorherigen Inhalt löschen, damit keine doppelten Karten angezeigt werden */
  container.innerHTML = '';

  /* Prüfen, ob überhaupt Artikel in dieser Kategorie vorhanden sind */
  if (artikel.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <p class="text-center">Keine Artikel in dieser Kategorie gefunden.</p>
      </div>
    `;
    return;
  }

  /* Über alle Artikel dieser Kategorie laufen */
  artikel.forEach(artikelItem => {
    /* 
      Für jeden Artikel eine HTML-Karte erstellen.
      Das Bild und der Name führen zur Artikeldetailseite.
    */
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

            <!-- Später kann hier die Warenkorb-Funktion ergänzt werden -->
            <a href="#" class="btn btn-main">In den Warenkorb</a>
          </div>
        </div>
      </div>
    `;

    /* Die erzeugte Karte in den Container einfügen */
    container.innerHTML += card;
  });
}

/*
  Diese Funktion zeigt eine Fehlermeldung
  direkt im Artikel-Container an.
*/
function renderKategorieArtikelFehler(message) {
  /* Den Container für die Artikel holen */
  const container = document.getElementById('kategorie-artikel-container');

  /* Prüfen, ob der Container im HTML existiert */
  if (!container) {
    console.error('Der Container mit der ID "kategorie-artikel-container" wurde nicht gefunden.');
    return;
  }

  /* Fehlermeldung im Container anzeigen */
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
    /* Die Kategorie-ID aus der URL lesen */
    const kategorieId = getKategorieIdFromUrl();

    /* Prüfen, ob überhaupt eine Kategorie-ID vorhanden ist */
    if (!kategorieId) {
      renderKategorieArtikelFehler('Keine Kategorie ausgewählt.');
      return;
    }

    /* 
      Anfrage an das Backend senden,
      um alle Kategorien aus der Datenbank zu laden.
    */
    const kategorienResponse = await fetch('/kategorien');

    /* Prüfen, ob die Serverantwort erfolgreich war */
    if (!kategorienResponse.ok) {
      throw new Error('Kategorien konnten nicht geladen werden');
    }

    /* Die Antwort in JSON umwandeln */
    const kategorien = await kategorienResponse.json();

    /* Den Titel der Seite mit dem Namen der aktuellen Kategorie setzen */
    setKategorieTitel(kategorien, kategorieId);

    /* 
      Anfrage an das Backend senden,
      um alle Artikel der ausgewählten Kategorie zu laden.
    */
    const artikelResponse = await fetch(`/artikel?kategorie_id=${kategorieId}`);

    /* Prüfen, ob die Serverantwort erfolgreich war */
    if (!artikelResponse.ok) {
      throw new Error('Artikel der Kategorie konnten nicht geladen werden');
    }

    /* Die Antwort in JSON umwandeln */
    const artikel = await artikelResponse.json();

    /* Alle geladenen Artikel im Container anzeigen */
    renderKategorieArtikel(artikel);

  } catch (error) {
    /* Fehlermeldung in der Konsole anzeigen */
    console.error('Fehler beim Laden der Kategorie-Artikel:', error);

    /* Zusätzlich eine sichtbare Fehlermeldung im HTML anzeigen */
    renderKategorieArtikelFehler('Die Artikel dieser Kategorie konnten nicht geladen werden.');
  }
}

/*
  Warten, bis die HTML-Seite vollständig geladen ist.
  Erst danach sollen die Artikel der ausgewählten Kategorie geladen werden.
*/
document.addEventListener('DOMContentLoaded', loadKategorieArtikel);