/*
  Datei: table.js
  Beschreibung: Zentrale Hilfsfunktionen für leere und fehlerhafte Tabellenzustände
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Rendert eine einzelne Statuszeile in einem Tabellen-Body.
 *
 * @function renderTableStatusRow
 * @param {HTMLElement|null} tbody - Tabellen-Body, in den die Zeile eingefügt werden soll
 * @param {number} colspan - Anzahl der Spalten, über die sich die Zeile erstrecken soll
 * @param {string} text - Anzuzeigender Text
 * @param {string} [zusatzKlasse=''] - Zusätzliche CSS-Klasse für die Tabellenzelle
 * @returns {void}
 */
function renderTableStatusRow(tbody, colspan, text, zusatzKlasse = '') {
  if (!tbody) {
    console.error('Tabellen-Body konnte nicht gefunden werden.');
    return;
  }

  const klasse = zusatzKlasse ? ` ${zusatzKlasse}` : '';

  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="text-center${klasse}">
        ${text}
      </td>
    </tr>
  `;
}

/**
 * Rendert eine Tabellenzeile für einen leeren Zustand.
 *
 * @function renderTableEmpty
 * @param {HTMLElement|null} tbody - Tabellen-Body, in den die Zeile eingefügt werden soll
 * @param {number} colspan - Anzahl der Spalten, über die sich die Zeile erstrecken soll
 * @param {string} text - Anzuzeigender Text für den leeren Zustand
 * @returns {void}
 */
function renderTableEmpty(tbody, colspan, text) {
  renderTableStatusRow(tbody, colspan, text);
}

/**
 * Rendert eine Tabellenzeile für einen Fehlerzustand.
 *
 * @function renderTableError
 * @param {HTMLElement|null} tbody - Tabellen-Body, in den die Zeile eingefügt werden soll
 * @param {number} colspan - Anzahl der Spalten, über die sich die Zeile erstrecken soll
 * @param {string} text - Anzuzeigender Fehlertext
 * @returns {void}
 */
function renderTableError(tbody, colspan, text) {
  renderTableStatusRow(tbody, colspan, text, 'text-danger');
}