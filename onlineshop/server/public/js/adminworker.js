/*
  Datei: adminworker.js
  Beschreibung: Diese Datei steuert die Admin-Seite für die Worker-Übersicht.
    Sie prüft beim Laden der Seite den Admin-Zugriff, lädt die Worker- und
    Aufgabendaten vom Backend und zeigt sie in Tabellen an.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js sowie die
    zentrale Formatierungslogik aus format.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

// Lädt die Worker-Übersicht nach dem Aufbau des DOM
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdmin('/static/login.html', '/static/index.html');
    await ladeWorker();
    await ladeAufgaben();

    // automatische Aktualisierung der Übersicht
    setInterval(async () => {
      try {
        await ladeWorker();
        await ladeAufgaben();
      } catch (fehler) {
        console.error('Fehler beim automatischen Aktualisieren:', fehler);
      }
    }, 10000);
  } catch (fehler) {
    console.error('Fehler bei der Initialisierung der Worker-Übersicht:', fehler);
  }
});

/**
 * Ermittelt die passende Badge-Klasse für einen Worker-Status.
 *
 * @function getWorkerStatusBadgeClass
 * @param {string} status - Status des Workers
 * @returns {string} CSS-Klasse für Bootstrap-Badge
 */
function getWorkerStatusBadgeClass(status) {
  switch (status) {
    case 'aktiv':
      return 'text-bg-success';
    case 'inaktiv':
      return 'text-bg-secondary';
    default:
      return 'text-bg-light';
  }
}

/**
 * Ermittelt die passende Badge-Klasse für einen Aufgaben-Status.
 *
 * @function getAufgabenStatusBadgeClass
 * @param {string} status - Status der Aufgabe
 * @returns {string} CSS-Klasse für Bootstrap-Badge
 */
function getAufgabenStatusBadgeClass(status) {
  switch (status) {
    case 'wartend':
      return 'text-bg-secondary';
    case 'zugewiesen':
      return 'text-bg-info';
    case 'in_bearbeitung':
      return 'text-bg-warning';
    case 'abgeschlossen':
      return 'text-bg-success';
    case 'fehlgeschlagen':
      return 'text-bg-danger';
    default:
      return 'text-bg-light';
  }
}

/**
 * Formatiert einen Worker-Status als Badge.
 *
 * @function renderWorkerStatusBadge
 * @param {string} status - Status des Workers
 * @returns {string} HTML-String für Badge
 */
function renderWorkerStatusBadge(status) {
  const badgeClass = getWorkerStatusBadgeClass(status);

  return `<span class="badge ${badgeClass}">${status ?? '-'}</span>`;
}

/**
 * Formatiert einen Aufgaben-Status als Badge.
 *
 * @function renderAufgabenStatusBadge
 * @param {string} status - Status der Aufgabe
 * @returns {string} HTML-String für Badge
 */
function renderAufgabenStatusBadge(status) {
  const badgeClass = getAufgabenStatusBadgeClass(status);

  return `<span class="badge ${badgeClass}">${status ?? '-'}</span>`;
}

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
    const antwort = await fetch('/worker', {
      credentials: 'same-origin'
    });

    const worker = await antwort.json();

    if (!antwort.ok) {
      throw new Error(worker.message || 'Fehler beim Laden der Worker.');
    }

    if (!Array.isArray(worker) || worker.length === 0) {
      renderTableEmpty(workerTabelle, 5, 'Keine Worker gefunden.');
      return;
    }

    workerTabelle.innerHTML = '';

    worker.forEach((eintrag) => {
      const zeile = document.createElement('tr');

      const istAktiv = eintrag.status === 'aktiv';
      const buttonText = istAktiv ? 'Deaktivieren' : 'Aktivieren';
      const neuerStatus = istAktiv ? 'inaktiv' : 'aktiv';
      const buttonKlasse = istAktiv ? 'btn-outline-danger' : 'btn-outline-success';

      zeile.innerHTML = `
        <td>${eintrag.id ?? '-'}</td>
        <td>${eintrag.typ ?? '-'}</td>
        <td>${renderWorkerStatusBadge(eintrag.status)}</td>
        <td>${formatDatumMitUhrzeit(eintrag.letzter_heartbeat)}</td>
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
    renderTableError(workerTabelle, 5, 'Worker-Daten konnten nicht geladen werden.');
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
    const antwort = await fetch('/worker/aufgaben', {
      credentials: 'same-origin'
    });

    const aufgaben = await antwort.json();

    if (!antwort.ok) {
      throw new Error(aufgaben.message || 'Fehler beim Laden der Aufgaben.');
    }

    if (!Array.isArray(aufgaben) || aufgaben.length === 0) {
      renderTableEmpty(aufgabenTabelle, 7, 'Keine Aufgaben gefunden.');
      return;
    }

    aufgabenTabelle.innerHTML = '';

    aufgaben.forEach((eintrag) => {
      const zeile = document.createElement('tr');

      const fehlermeldung = eintrag.fehlermeldung
        ? String(eintrag.fehlermeldung)
        : '-';

      zeile.innerHTML = `
        <td>${eintrag.id ?? '-'}</td>
        <td>${eintrag.typ ?? '-'}</td>
        <td>${renderAufgabenStatusBadge(eintrag.status)}</td>
        <td>${eintrag.worker_id ?? '-'}</td>
        <td>${eintrag.versuch_anzahl ?? 0}</td>
        <td title="${escapeHtml(fehlermeldung)}">${escapeHtml(kuerzeText(fehlermeldung, 60))}</td>
        <td>${formatDatumMitUhrzeit(eintrag.erstellungszeitpunkt)}</td>
      `;

      aufgabenTabelle.appendChild(zeile);
    });
  } catch (fehler) {
    console.error('Fehler beim Laden der Aufgaben:', fehler);
    renderTableError(aufgabenTabelle, 7, 'Aufgaben-Daten konnten nicht geladen werden.');
  }
}

/**
 * Ändert den Status eines Workers über das Backend und lädt danach
 * die Worker- und Aufgaben-Tabelle neu.
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
      credentials: 'same-origin',
      body: JSON.stringify({
        status: neuerStatus
      })
    });

    const daten = await antwort.json();

    if (!antwort.ok) {
      throw new Error(daten.message || 'Fehler beim Aktualisieren des Worker-Status.');
    }

    await ladeWorker();
    await ladeAufgaben();
  } catch (fehler) {
    console.error('Fehler beim Ändern des Worker-Status:', fehler);
    alert('Der Worker-Status konnte nicht geändert werden.');
  }
}

/**
 * Kürzt einen Text auf eine maximale Länge.
 *
 * @function kuerzeText
 * @param {string} text - Ursprünglicher Text
 * @param {number} maxLaenge - Maximale Länge
 * @returns {string} Gekürzter Text
 */
function kuerzeText(text, maxLaenge) {
  if (typeof text !== 'string') {
    return '-';
  }

  if (text.length <= maxLaenge) {
    return text;
  }

  return text.slice(0, maxLaenge - 3) + '...';
}

/**
 * Escaped HTML-Sonderzeichen in einem Text.
 *
 * @function escapeHtml
 * @param {string} text - Zu escapender Text
 * @returns {string} HTML-sicherer Text
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}