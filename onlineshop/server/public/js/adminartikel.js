// Wartet darauf, dass die Seite vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Nach dem Laden der Seite wird zuerst geprüft,
  // ob der aktuelle Benutzer ein Admin ist
  pruefeAdminZugriff();

  // Button zum Abbrechen mit Funktion verbinden
  const abbrechenButton = document.getElementById('abbrechen-button');

  if (abbrechenButton) {
    abbrechenButton.addEventListener('click', () => {
      // Formular ausblenden
      document.getElementById('artikel-formular-bereich').style.display = 'none';

      // Formular zurücksetzen
      document.getElementById('artikel-formular').reset();

      // Versteckte Felder leeren
      document.getElementById('artikel-id').value = '';
      document.getElementById('aktuelles-bild-url').value = '';

      // Bildvorschau zurücksetzen
      versteckeBildVorschau();
    });
  }

  // Button zum Anlegen eines neuen Artikels mit Funktion verbinden
  const neuerArtikelButton = document.getElementById('neuer-artikel-button');

  if (neuerArtikelButton) {
    neuerArtikelButton.addEventListener('click', () => {
      // Formular sichtbar machen
      document.getElementById('artikel-formular-bereich').style.display = 'block';

      // Überschrift für neuen Artikel setzen
      document.getElementById('formular-ueberschrift').textContent = 'Neuen Artikel anlegen';

      // Formular zurücksetzen
      document.getElementById('artikel-formular').reset();

      // Versteckte Felder leeren
      document.getElementById('artikel-id').value = '';
      document.getElementById('aktuelles-bild-url').value = '';

      // Standardoption im Kategorien-Feld auswählen
      document.getElementById('kategorie-id').value = '';

      // Bildvorschau zurücksetzen
      versteckeBildVorschau();

      // Zum Formular scrollen
      document.getElementById('artikel-formular-bereich').scrollIntoView({
        behavior: 'smooth'
      });
    });
  }

  // Dateiauswahl mit Vorschau verbinden
  const bildDateiInput = document.getElementById('bild-datei');

  if (bildDateiInput) {
    bildDateiInput.addEventListener('change', () => {
      const datei = bildDateiInput.files[0];

      if (datei) {
        const bildUrl = URL.createObjectURL(datei);
        zeigeBildVorschau(bildUrl);
      } else {
        const aktuellesBildUrl = document.getElementById('aktuelles-bild-url').value;

        if (aktuellesBildUrl) {
          zeigeBildVorschau(aktuellesBildUrl);
        } else {
          versteckeBildVorschau();
        }
      }
    });
  }

  // Formular mit der Speichern-Funktion verbinden
  const artikelFormular = document.getElementById('artikel-formular');

  if (artikelFormular) {
    artikelFormular.addEventListener('submit', async (event) => {
      // Standardverhalten des Formulars verhindern
      event.preventDefault();

      // Werte aus dem Formular lesen
      const artikelId = document.getElementById('artikel-id').value;
      const kategorieId = document.getElementById('kategorie-id').value;
      const bezeichnung = document.getElementById('bezeichnung').value;
      const preis = document.getElementById('preis').value;
      const beschreibung = document.getElementById('beschreibung').value;
      const langbeschreibung = document.getElementById('langbeschreibung').value;
      const bildDatei = document.getElementById('bild-datei').files[0];
      const aktuellesBildUrl = document.getElementById('aktuelles-bild-url').value;

      try {
        let response;

        // FormData für Textfelder und Datei erstellen
        const formData = new FormData();
        formData.append('kategorie_id', Number(kategorieId));
        formData.append('bezeichnung', bezeichnung);
        formData.append('beschreibung', beschreibung);
        formData.append('preis', Number(preis));
        formData.append('langbeschreibung', langbeschreibung);
        formData.append('aktuelles_bild_url', aktuellesBildUrl);

        // Neue Bilddatei nur anhängen, wenn eine Datei ausgewählt wurde
        if (bildDatei) {
          formData.append('bild', bildDatei);
        }

        // Wenn eine Artikel-ID vorhanden ist, wird der Artikel bearbeitet
        if (artikelId) {
          response = await fetch(`/artikel/${artikelId}`, {
            method: 'PUT',
            body: formData
          });
        } else {
          // Wenn keine Artikel-ID vorhanden ist, wird ein neuer Artikel angelegt
          response = await fetch('/artikel', {
            method: 'POST',
            body: formData
          });
        }

        // Prüfen, ob das Speichern erfolgreich war
        if (!response.ok) {
          throw new Error('Fehler beim Speichern des Artikels.');
        }

        // Formular ausblenden
        document.getElementById('artikel-formular-bereich').style.display = 'none';

        // Formular zurücksetzen
        artikelFormular.reset();

        // Versteckte Felder leeren
        document.getElementById('artikel-id').value = '';
        document.getElementById('aktuelles-bild-url').value = '';

        // Bildvorschau zurücksetzen
        versteckeBildVorschau();

        // Artikelliste neu laden
        ladeArtikel();

        // Erfolgsmeldung je nach Aktion anzeigen
        if (artikelId) {
          alert('Artikel erfolgreich aktualisiert.');
        } else {
          alert('Artikel erfolgreich angelegt.');
        }
      } catch (fehler) {
        // Fehler beim Speichern ausgeben
        console.error('Fehler beim Speichern des Artikels:', fehler);
        alert('Der Artikel konnte nicht gespeichert werden.');
      }
    });
  }
});

// Prüft, ob ein Benutzer eingeloggt ist
// und ob dieser Benutzer die Rolle "admin" hat
async function pruefeAdminZugriff() {
  try {
    // Anfrage an den Server senden, um die aktuelle Session zu prüfen
    const response = await fetch('/benutzer/session', {
      method: 'GET',
      credentials: 'same-origin'
    });

    // Wenn keine gültige Session vorhanden ist,
    // wird der Benutzer zur Login-Seite weitergeleitet
    if (!response.ok) {
      window.location.href = 'login.html';
      return;
    }

    // Die Antwort vom Server in JSON umwandeln
    const benutzer = await response.json();

    // Prüfen, ob der eingeloggte Benutzer die Rolle "admin" hat
    if (benutzer.rolle !== 'admin') {
      // Benutzer ohne Admin-Rechte zurück zur Startseite schicken
      window.location.href = 'index.html';
      return;
    }

    // Wenn der Zugriff erlaubt ist, werden zuerst die Kategorien
    // und danach die Artikel geladen
    await ladeKategorien();
    ladeArtikel();
  } catch (fehler) {
    // Fehler in der Konsole ausgeben
    console.error('Fehler bei der Prüfung des Admin-Zugriffs:', fehler);

    // Bei einem Fehler ebenfalls zur Login-Seite weiterleiten
    window.location.href = 'login.html';
  }
}

// Holt alle Kategorien vom Server
async function ladeKategorien() {
  try {
    // Anfrage an den Server senden, um alle Kategorien zu laden
    const response = await fetch('/kategorien');
    const daten = await response.json();

    console.log('Geladene Kategorien:', daten);

    // Referenz auf das Auswahlfeld holen
    const kategorieSelect = document.getElementById('kategorie-id');

    // Alte Einträge löschen und Standardoption setzen
    kategorieSelect.innerHTML = '<option value="">Bitte auswählen</option>';

    // Für jede Kategorie eine neue Option erstellen
    daten.forEach(kategorie => {
      const option = document.createElement('option');
      option.value = kategorie.id;
      option.textContent = kategorie.bezeichnung;
      kategorieSelect.appendChild(option);
    });
  } catch (fehler) {
    // Fehler beim Laden der Kategorien ausgeben
    console.error('Fehler beim Laden der Kategorien:', fehler);
    alert('Die Kategorien konnten nicht geladen werden.');
  }
}

// Holt alle Artikel vom Server
async function ladeArtikel() {
  try {
    // Anfrage an den Server senden, um alle Artikel zu laden
    const response = await fetch('/artikel');
    const daten = await response.json();

    console.log('Geladene Artikel:', daten);

    // Referenz auf den Tabellenkörper holen
    const tbody = document.getElementById('artikel-tabelle');

    // Alte Tabelleninhalte löschen
    tbody.innerHTML = '';

    // Für jeden Artikel eine neue Tabellenzeile erstellen
    daten.forEach(artikel => {
      const zeile = document.createElement('tr');

      zeile.innerHTML = `
        <td>${artikel.id}</td>
        <td>
          <img
            src="${artikel.bild_url || 'images/placeholder.png'}"
            alt="${artikel.bezeichnung}"
            style="width: 60px; height: 80px; object-fit: cover;"
          >
        </td>
        <td>${artikel.bezeichnung}</td>
        <td>${artikel.preis} €</td>
        <td>${artikel.kategorie_name}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-2 bearbeiten-button">Bearbeiten</button>
          <button class="btn btn-sm btn-outline-danger loeschen-button">Löschen</button>
        </td>
      `;

      // Zeile in die Tabelle einfügen
      tbody.appendChild(zeile);

      // Button zum Bearbeiten aus der aktuellen Zeile holen
      const bearbeitenButton = zeile.querySelector('.bearbeiten-button');

      // Button zum Löschen aus der aktuellen Zeile holen
      const loeschenButton = zeile.querySelector('.loeschen-button');

      // Beim Klick auf "Bearbeiten" werden die Artikeldaten geladen
      bearbeitenButton.addEventListener('click', async () => {
        try {
          // Einzelnen Artikel vom Server laden
          const response = await fetch(`/artikel/${artikel.id}`);
          const artikelDetails = await response.json();

          // Formularbereich sichtbar machen
          document.getElementById('artikel-formular-bereich').style.display = 'block';

          // Überschrift des Formulars anpassen
          document.getElementById('formular-ueberschrift').textContent = 'Artikel bearbeiten';

          // Artikeldaten in die Formularfelder einfügen
          document.getElementById('artikel-id').value = artikelDetails.id;
          document.getElementById('kategorie-id').value = artikelDetails.kategorie_id;
          document.getElementById('bezeichnung').value = artikelDetails.bezeichnung;
          document.getElementById('preis').value = artikelDetails.preis;
          document.getElementById('beschreibung').value = artikelDetails.beschreibung || '';
          document.getElementById('langbeschreibung').value = artikelDetails.langbeschreibung || '';
          document.getElementById('aktuelles-bild-url').value = artikelDetails.bild_url || '';

          // Dateifeld beim Bearbeiten leeren
          document.getElementById('bild-datei').value = '';

          // Bildvorschau anzeigen, wenn ein Bild vorhanden ist
          if (artikelDetails.bild_url) {
            zeigeBildVorschau(artikelDetails.bild_url);
          } else {
            versteckeBildVorschau();
          }

          // Nach oben zum Formular scrollen
          document.getElementById('artikel-formular-bereich').scrollIntoView({
            behavior: 'smooth'
          });
        } catch (fehler) {
          // Fehler beim Laden der Artikeldaten ausgeben
          console.error('Fehler beim Laden des Artikels:', fehler);
          alert('Der Artikel konnte nicht geladen werden.');
        }
      });

      // Beim Klick auf "Löschen" wird der Artikel gelöscht
      loeschenButton.addEventListener('click', async () => {
        const bestaetigt = confirm(`Soll der Artikel "${artikel.bezeichnung}" wirklich gelöscht werden?`);

        if (!bestaetigt) {
          return;
        }

        try {
          const response = await fetch(`/artikel/${artikel.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            throw new Error('Fehler beim Löschen des Artikels.');
          }

          ladeArtikel();
          alert('Artikel erfolgreich gelöscht.');
        } catch (fehler) {
          console.error('Fehler beim Löschen des Artikels:', fehler);
          alert('Der Artikel konnte nicht gelöscht werden.');
        }
      });
    });
  } catch (fehler) {
    // Fehler beim Laden der Artikel ausgeben
    console.error('Fehler beim Laden der Artikel:', fehler);
  }
}

// Zeigt die Bildvorschau an
function zeigeBildVorschau(bildUrl) {
  const bildVorschauBereich = document.getElementById('bild-vorschau-bereich');
  const bildVorschau = document.getElementById('bild-vorschau');

  bildVorschau.src = bildUrl;
  bildVorschauBereich.style.display = 'block';
}

// Versteckt die Bildvorschau
function versteckeBildVorschau() {
  const bildVorschauBereich = document.getElementById('bild-vorschau-bereich');
  const bildVorschau = document.getElementById('bild-vorschau');

  bildVorschau.src = '';
  bildVorschauBereich.style.display = 'none';
}