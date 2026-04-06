/*
  Datei: adminartikel.js
  Beschreibung: Diese Datei steuert die Verwaltung und Bearbeitung von Artikeln
    im Admin-Bereich. Sie prüft den Admin-Zugriff und ermöglicht das Bearbeiten,
    Hinzufügen und Löschen von Artikeln.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js
    sowie die zentrale Formatierungslogik aus format.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

// Initialisiert die Seite nach dem Laden des DOM
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
    await ladeKategorien();
    await ladeArtikel();
  } catch (fehler) {
    console.error('Fehler bei der Initialisierung des Admin-Bereichs:', fehler);
    return;
  }

  const abbrechenButton = document.getElementById('abbrechen-button');
  const neuerArtikelButton = document.getElementById('neuer-artikel-button');
  const bildDateiInput = document.getElementById('bild-datei');
  const artikelFormular = document.getElementById('artikel-formular');

  if (abbrechenButton) {
    abbrechenButton.addEventListener('click', () => {
      document.getElementById('artikel-formular-bereich').style.display = 'none';
      document.getElementById('artikel-formular').reset();
      document.getElementById('artikel-id').value = '';
      document.getElementById('aktuelles-bild-url').value = '';
      versteckeBildVorschau();
    });
  }

  if (neuerArtikelButton) {
    neuerArtikelButton.addEventListener('click', () => {
      document.getElementById('artikel-formular-bereich').style.display = 'block';
      document.getElementById('formular-ueberschrift').textContent = 'Neuen Artikel anlegen';
      document.getElementById('artikel-formular').reset();
      document.getElementById('artikel-id').value = '';
      document.getElementById('aktuelles-bild-url').value = '';
      document.getElementById('kategorie-id').value = '';
      versteckeBildVorschau();

      document.getElementById('artikel-formular-bereich').scrollIntoView({
        behavior: 'smooth'
      });
    });
  }

  if (bildDateiInput) {
    bildDateiInput.addEventListener('change', () => {
      const datei = bildDateiInput.files[0];

      if (datei) {
        const bildUrl = URL.createObjectURL(datei);
        zeigeBildVorschau(bildUrl);
        return;
      }

      const aktuellesBildUrl = document.getElementById('aktuelles-bild-url').value;

      if (aktuellesBildUrl) {
        zeigeBildVorschau(aktuellesBildUrl);
      } else {
        versteckeBildVorschau();
      }
    });
  }

  if (artikelFormular) {
    artikelFormular.addEventListener('submit', async (event) => {
      event.preventDefault();

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

        const formData = new FormData();
        formData.append('kategorie_id', Number(kategorieId));
        formData.append('bezeichnung', bezeichnung);
        formData.append('beschreibung', beschreibung);
        formData.append('preis', Number(preis));
        formData.append('langbeschreibung', langbeschreibung);
        formData.append('aktuelles_bild_url', aktuellesBildUrl);

        // Bild nur mitsenden, wenn eine neue Datei ausgewählt wurde
        if (bildDatei) {
          formData.append('bild', bildDatei);
        }

        if (artikelId) {
          response = await fetch(`/artikel/${artikelId}`, {
            method: 'PUT',
            body: formData
          });
        } else {
          response = await fetch('/artikel', {
            method: 'POST',
            body: formData
          });
        }

        if (!response.ok) {
          throw new Error('Fehler beim Speichern des Artikels.');
        }

        document.getElementById('artikel-formular-bereich').style.display = 'none';
        artikelFormular.reset();
        document.getElementById('artikel-id').value = '';
        document.getElementById('aktuelles-bild-url').value = '';
        versteckeBildVorschau();

        await ladeArtikel();

        if (artikelId) {
          alert('Artikel erfolgreich aktualisiert.');
        } else {
          alert('Artikel erfolgreich angelegt.');
        }
      } catch (fehler) {
        console.error('Fehler beim Speichern des Artikels:', fehler);
        alert('Der Artikel konnte nicht gespeichert werden.');
      }
    });
  }
});

/**
 * Lädt alle Kategorien vom Server und füllt das Auswahlfeld im Formular.
 * Zeigt bei einem Fehler eine Meldung an.
 *
 * @async
 * @function ladeKategorien
 * @returns {Promise<void>}
 */
async function ladeKategorien() {
  try {
    const response = await fetch('/kategorien');
    const daten = await response.json();

    console.log('Geladene Kategorien:', daten);

    const kategorieSelect = document.getElementById('kategorie-id');
    kategorieSelect.innerHTML = '<option value="">Bitte auswählen</option>';

    daten.forEach(kategorie => {
      const option = document.createElement('option');
      option.value = kategorie.id;
      option.textContent = kategorie.bezeichnung;
      kategorieSelect.appendChild(option);
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Kategorien:', fehler);
    alert('Die Kategorien konnten nicht geladen werden.');
  }
}

/**
 * Lädt alle Artikel vom Server und zeigt sie in der Tabelle an.
 * Verknüpft außerdem die Aktionen zum Bearbeiten und Löschen.
 *
 * @async
 * @function ladeArtikel
 * @returns {Promise<void>}
 */
async function ladeArtikel() {
  try {
    const response = await fetch('/artikel');
    const daten = await response.json();

    console.log('Geladene Artikel:', daten);

    const tbody = document.getElementById('artikel-tabelle');
    tbody.innerHTML = '';

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
        <td>${formatPreis(artikel.preis)}</td>
        <td>${artikel.kategorie_name}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-2 bearbeiten-button">Bearbeiten</button>
          <button class="btn btn-sm btn-outline-danger loeschen-button">Löschen</button>
        </td>
      `;

      tbody.appendChild(zeile);

      const bearbeitenButton = zeile.querySelector('.bearbeiten-button');
      const loeschenButton = zeile.querySelector('.loeschen-button');

      bearbeitenButton.addEventListener('click', async () => {
        try {
          const response = await fetch(`/artikel/${artikel.id}`);
          const artikelDetails = await response.json();

          document.getElementById('artikel-formular-bereich').style.display = 'block';
          document.getElementById('formular-ueberschrift').textContent = 'Artikel bearbeiten';

          document.getElementById('artikel-id').value = artikelDetails.id;
          document.getElementById('kategorie-id').value = artikelDetails.kategorie_id;
          document.getElementById('bezeichnung').value = artikelDetails.bezeichnung;
          document.getElementById('preis').value = artikelDetails.preis;
          document.getElementById('beschreibung').value = artikelDetails.beschreibung || '';
          document.getElementById('langbeschreibung').value = artikelDetails.langbeschreibung || '';
          document.getElementById('aktuelles-bild-url').value = artikelDetails.bild_url || '';
          document.getElementById('bild-datei').value = '';

          if (artikelDetails.bild_url) {
            zeigeBildVorschau(artikelDetails.bild_url);
          } else {
            versteckeBildVorschau();
          }

          document.getElementById('artikel-formular-bereich').scrollIntoView({
            behavior: 'smooth'
          });
        } catch (fehler) {
          console.error('Fehler beim Laden des Artikels:', fehler);
          alert('Der Artikel konnte nicht geladen werden.');
        }
      });

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

          await ladeArtikel();
          alert('Artikel erfolgreich gelöscht.');
        } catch (fehler) {
          console.error('Fehler beim Löschen des Artikels:', fehler);
          alert('Der Artikel konnte nicht gelöscht werden.');
        }
      });
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Artikel:', fehler);
  }
}

/**
 * Zeigt die Bildvorschau im Formular an und blendet den Vorschaubereich ein.
 *
 * @function zeigeBildVorschau
 * @param {string} bildUrl - URL des anzuzeigenden Bildes
 */
function zeigeBildVorschau(bildUrl) {
  const bildVorschauBereich = document.getElementById('bild-vorschau-bereich');
  const bildVorschau = document.getElementById('bild-vorschau');

  bildVorschau.src = bildUrl;
  bildVorschauBereich.style.display = 'block';
}

/**
 * Blendet die Bildvorschau aus und entfernt das aktuell angezeigte Bild.
 *
 * @function versteckeBildVorschau
 */
function versteckeBildVorschau() {
  const bildVorschauBereich = document.getElementById('bild-vorschau-bereich');
  const bildVorschau = document.getElementById('bild-vorschau');

  bildVorschau.src = '';
  bildVorschauBereich.style.display = 'none';
}