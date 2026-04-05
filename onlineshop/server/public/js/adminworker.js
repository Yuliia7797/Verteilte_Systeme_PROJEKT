/*
  Datei: adminworker.js
  Beschreibung: Diese Datei steuert die Admin-Seite für die Worker-Übersicht.
    Sie lädt die Worker-Daten und die Aufgaben-Daten vom Backend, zeigt diese in
    Tabellen an und ermöglicht das Aktivieren oder Deaktivieren einzelner Worker.
  Hinweise: Lädt Worker- und Aufgaben-Daten, ermöglicht Aktivieren/Deaktivieren
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

// Lädt nach dem Aufbau des DOM die Worker- und Aufgabenübersicht
document.addEventListener('DOMContentLoaded', () => {
  ladeWorker();
  ladeAufgaben();
});

/**
 * Lädt alle Worker vom Server und zeigt sie in der Worker-Tabelle an.
 * Erstellt für jeden Worker eine Schaltfläche zum Aktivieren oder Deaktivieren.
 *
 * @async
 * @function ladeWorker
 * @returns {Promise<void>}
 */
async function ladeWorker() {
  const workerTabelle = document.getElementById('worker-tabelle');

  try {
    const antwort = await fetch('/worker');
    const worker = await antwort.json();

    if (!antwort.ok) {
      throw new Error('Fehler beim Laden der Worker.');
    }

    if (!Array.isArray(worker) || worker.length === 0) {
      workerTabelle.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">Keine Worker gefunden.</td>
        </tr>
      `;
      return;
    }

    workerTabelle.innerHTML = '';

    worker.forEach((eintrag) => {
      const zeile = document.createElement('tr');

      const istAktiv = eintrag.status === 'aktiv';
      const buttonText = istAktiv ? 'OUT' : 'IN';
      const neuerStatus = istAktiv ? 'inaktiv' : 'aktiv';
      const buttonKlasse = istAktiv ? 'btn-outline-danger' : 'btn-outline-success';

      zeile.innerHTML = `
        <td>${eintrag.id ?? '-'}</td>
        <td>${eintrag.typ ?? '-'}</td>
        <td>${eintrag.status ?? '-'}</td>
        <td>${formatiereDatum(eintrag.letzter_heartbeat)}</td>
        <td>
          <button
            type="button"
            class="btn btn-sm ${buttonKlasse}"
            onclick="aendereWorkerStatus(${eintrag.id}, '${neuerStatus}')"
          >
            ${buttonText}
          </button>
        </td>
      `;

      workerTabelle.appendChild(zeile);
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Worker:', fehler);

    workerTabelle.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">
          Worker-Daten konnten nicht geladen werden.
        </td>
      </tr>
    `;
  }
}

/**
 * Lädt alle Aufgaben vom Server und zeigt sie in der Aufgaben-Tabelle an.
 *
 * @async
 * @function ladeAufgaben
 * @returns {Promise<void>}
 */
async function ladeAufgaben() {
  const aufgabenTabelle = document.getElementById('aufgaben-tabelle');

  try {
    const antwort = await fetch('/worker/aufgaben');
    const aufgaben = await antwort.json();

    if (!antwort.ok) {
      throw new Error('Fehler beim Laden der Aufgaben.');
    }

    if (!Array.isArray(aufgaben) || aufgaben.length === 0) {
      aufgabenTabelle.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">Keine Aufgaben gefunden.</td>
        </tr>
      `;
      return;
    }

    aufgabenTabelle.innerHTML = '';

    aufgaben.forEach((eintrag) => {
      const zeile = document.createElement('tr');

      zeile.innerHTML = `
        <td>${eintrag.id ?? '-'}</td>
        <td>${eintrag.typ ?? '-'}</td>
        <td>${eintrag.status ?? '-'}</td>
        <td>${eintrag.worker_id ?? '-'}</td>
        <td>${eintrag.versuch_anzahl ?? '-'}</td>
        <td>${eintrag.fehlermeldung ?? '-'}</td>
        <td>${formatiereDatum(eintrag.erstellungszeitpunkt)}</td>
      `;

      aufgabenTabelle.appendChild(zeile);
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Aufgaben:', fehler);

    aufgabenTabelle.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          Aufgaben-Daten konnten nicht geladen werden.
        </td>
      </tr>
    `;
  }
}

/**
 * Ändert den Status eines Workers über das Backend und lädt danach
 * die Worker-Tabelle neu.
 *
 * @async
 * @function aendereWorkerStatus
 * @param {number} workerId - ID des Workers
 * @param {string} neuerStatus - Neuer Status des Workers
 * @returns {Promise<void>}
 */
async function aendereWorkerStatus(workerId, neuerStatus) {
  try {
    const antwort = await fetch(`/worker/${workerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: neuerStatus
      })
    });

    const daten = await antwort.json();

    if (!antwort.ok) {
      throw new Error(daten.message || 'Fehler beim Aktualisieren des Worker-Status.');
    }

    ladeWorker();
  } catch (fehler) {
    console.error('Fehler beim Ändern des Worker-Status:', fehler);
    alert('Der Worker-Status konnte nicht geändert werden.');
  }
}

/**
 * Formatiert ein Datum für die Anzeige im deutschen Format.
 * Gibt bei ungültigen oder fehlenden Werten ein Platzhalterzeichen zurück.
 *
 * @function formatiereDatum
 * @param {string|null|undefined} wert - Datum aus dem Backend
 * @returns {string} Formatiertes Datum oder "-"
 */
function formatiereDatum(wert) {
  if (!wert) {
    return '-';
  }

  const datum = new Date(wert);

  if (isNaN(datum.getTime())) {
    return '-';
  }

  return datum.toLocaleString('de-DE');
}