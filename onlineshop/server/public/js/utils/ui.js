/*
  Datei: ui.js
  Beschreibung: Zentrale Hilfsfunktionen zur Anzeige und Verwaltung von UI-Meldungen
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Escaped HTML-Sonderzeichen für eine sichere Ausgabe im DOM.
 *
 * @function escapeHtml
 * @param {string} text - Zu escapender Text
 * @returns {string} Sicherer HTML-Text
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Zeigt eine Meldung in einem Ziel-Element an.
 *
 * @function zeigeMeldung
 * @param {string} elementId - ID des Zielelements
 * @param {string} text - Meldungstext
 * @param {string} [typ='success'] - Bootstrap-Typ, z. B. success, danger, warning, info
 * @returns {void}
 */
function zeigeMeldung(elementId, text, typ = 'success') {
  const element = document.getElementById(elementId);

  if (!element) {
    console.warn(`Meldungs-Element mit ID "${elementId}" wurde nicht gefunden.`);
    return;
  }

  element.innerHTML = `
    <div class="alert alert-${typ} mb-0" role="alert">
      ${escapeHtml(text)}
    </div>
  `;
}

/**
 * Zeigt eine Fehlermeldung in einem Ziel-Element an.
 *
 * @function zeigeFehler
 * @param {string} elementId - ID des Zielelements
 * @param {string} text - Fehlermeldung
 * @returns {void}
 */
function zeigeFehler(elementId, text) {
  zeigeMeldung(elementId, text, 'danger');
}

/**
 * Zeigt eine Erfolgsmeldung in einem Ziel-Element an.
 *
 * @function zeigeErfolg
 * @param {string} elementId - ID des Zielelements
 * @param {string} text - Erfolgsmeldung
 * @returns {void}
 */
function zeigeErfolg(elementId, text) {
  zeigeMeldung(elementId, text, 'success');
}

/**
 * Entfernt eine Meldung aus einem Ziel-Element.
 *
 * @function entferneMeldung
 * @param {string} elementId - ID des Zielelements
 * @returns {void}
 */
function entferneMeldung(elementId) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.innerHTML = '';
}