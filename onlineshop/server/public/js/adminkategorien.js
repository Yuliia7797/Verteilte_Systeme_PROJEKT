/*
  Datei: adminkategorien.js
  Beschreibung: Diese Datei steuert die Verwaltung und Bearbeitung von Kategorien
    im Admin-Bereich. Sie lädt Kategorien und ermöglicht das Hinzufügen, Bearbeiten
    und Löschen von Kategorien.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

// Initialisiert die Seite nach dem Laden des DOM
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
  } catch (fehler) {
    console.error('Fehler bei der Initialisierung der Kategorienverwaltung:', fehler);
    return;
  }

  const kategorienTabelle = document.getElementById('kategorien-tabelle');
  const neueKategorieButton = document.getElementById('neue-kategorie-button');
  const formularBereich = document.getElementById('kategorie-formular-bereich');
  const formular = document.getElementById('kategorie-formular');
  const bezeichnungInput = document.getElementById('bezeichnung');
  const abbrechenButton = document.getElementById('abbrechen-button');

  ladeKategorien();

  // Öffnet das Formular zum Anlegen einer neuen Kategorie
  neueKategorieButton.addEventListener('click', () => {
    formular.reset();
    formularBereich.style.display = 'block';

    formularBereich.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    bezeichnungInput.focus();
  });

  // Schließt das Formular ohne Speichern
  abbrechenButton.addEventListener('click', () => {
    formular.reset();
    formularBereich.style.display = 'none';
  });

  // Speichert eine neue Kategorie
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

  /**
   * Lädt alle Kategorien vom Server und zeigt sie in der Tabelle an.
   * Fügt außerdem Event-Listener für das Löschen hinzu.
   *
   * @async
   * @function ladeKategorien
   * @returns {Promise<void>}
   */
  async function ladeKategorien() {
    try {
      const response = await fetch('/kategorien');
      const kategorien = await response.json();

      kategorienTabelle.innerHTML = '';

      if (!Array.isArray(kategorien) || kategorien.length === 0) {
        renderTableEmpty(kategorienTabelle, 3, 'Keine Kategorien vorhanden.');
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

      // Verknüpft die Lösch-Buttons mit der Delete-Funktion
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
      renderTableError(kategorienTabelle, 3, 'Kategorien konnten nicht geladen werden.');
    }
  }
});