// Wartet darauf, dass die Seite vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Elemente aus der HTML-Seite holen
  const kategorienTabelle = document.getElementById('kategorien-tabelle');
  const neueKategorieButton = document.getElementById('neue-kategorie-button');
  const formularBereich = document.getElementById('kategorie-formular-bereich');
  const formular = document.getElementById('kategorie-formular');
  const bezeichnungInput = document.getElementById('bezeichnung');
  const abbrechenButton = document.getElementById('abbrechen-button');

  // Kategorien direkt beim Laden anzeigen
  ladeKategorien();

  // Formular anzeigen
  neueKategorieButton.addEventListener('click', () => {
  formular.reset();
  formularBereich.style.display = 'block';

  // Scrollt automatisch zum Formularbereich
  formularBereich.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });

  // Setzt den Cursor direkt in das Eingabefeld
  bezeichnungInput.focus();
  });

  // Formular wieder ausblenden
  abbrechenButton.addEventListener('click', () => {
    formular.reset();
    formularBereich.style.display = 'none';
  });

  // Neue Kategorie speichern
  formular.addEventListener('submit', async (event) => {
    event.preventDefault();

    const bezeichnung = bezeichnungInput.value.trim();

    if (!bezeichnung) {
      alert('Bitte eine Bezeichnung eingeben.');
      return;
    }

    try {
      const response = await fetch('/kategorien', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bezeichnung })
      });

      const daten = await response.json();

      if (!response.ok) {
        alert(daten.message || 'Kategorie konnte nicht erstellt werden.');
        return;
      }

      alert('Kategorie erfolgreich erstellt.');
      formular.reset();
      formularBereich.style.display = 'none';
      ladeKategorien();
    } catch (fehler) {
      console.error('Fehler beim Erstellen der Kategorie:', fehler);
      alert('Fehler beim Speichern der Kategorie.');
    }
  });

  // Alle Kategorien laden
  async function ladeKategorien() {
    try {
      const response = await fetch('/kategorien');
      const kategorien = await response.json();

      kategorienTabelle.innerHTML = '';

      if (!kategorien.length) {
        kategorienTabelle.innerHTML = `
          <tr>
            <td colspan="3" class="text-center text-muted">Keine Kategorien vorhanden.</td>
          </tr>
        `;
        return;
      }

      kategorien.forEach((kategorie) => {
        const zeile = document.createElement('tr');

        zeile.innerHTML = `
          <td>${kategorie.id}</td>
          <td>${kategorie.bezeichnung}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger loeschen-button" data-id="${kategorie.id}">
              Löschen
            </button>
          </td>
        `;

        kategorienTabelle.appendChild(zeile);
      });

      // Lösch-Buttons aktivieren
      document.querySelectorAll('.loeschen-button').forEach((button) => {
        button.addEventListener('click', async () => {
          const id = button.dataset.id;

          const bestaetigt = confirm('Möchten Sie diese Kategorie wirklich löschen?');

          if (!bestaetigt) {
            return;
          }

          try {
            const response = await fetch(`/kategorien/${id}`, {
              method: 'DELETE'
            });

            const daten = await response.json();

            if (!response.ok) {
              alert(daten.message || 'Kategorie konnte nicht gelöscht werden.');
              return;
            }

            alert('Kategorie erfolgreich gelöscht.');
            ladeKategorien();
          } catch (fehler) {
            console.error('Fehler beim Löschen der Kategorie:', fehler);
            alert('Fehler beim Löschen der Kategorie.');
          }
        });
      });
    } catch (fehler) {
      console.error('Fehler beim Laden der Kategorien:', fehler);
      kategorienTabelle.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-danger">Kategorien konnten nicht geladen werden.</td>
        </tr>
      `;
    }
  }
});