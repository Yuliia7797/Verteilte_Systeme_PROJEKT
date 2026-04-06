/*
  Datei: format.js
  Beschreibung: Diese Datei bündelt zentrale Hilfsfunktionen zur Formatierung
    von Preisen und Datumswerten im Frontend. Dadurch werden doppelte
    Formatierungsfunktionen in mehreren Dateien vermieden und die Darstellung
    bleibt im gesamten Projekt einheitlich.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Formatiert einen Preis als Euro-Betrag im deutschen Format.
 * Gibt bei ungültigen oder fehlenden Werten ein Platzhalterzeichen zurück.
 *
 * @function formatPreis
 * @param {number|string|null|undefined} wert - Preis aus dem Backend
 * @returns {string} Formatierter Preis oder "-"
 */
function formatPreis(wert) {
  if (wert === null || wert === undefined || wert === '') {
    return '-';
  }

  const zahl = Number(wert);

  if (Number.isNaN(zahl)) {
    return '-';
  }

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(zahl);
}

/**
 * Formatiert ein Datum im deutschen Format ohne Uhrzeit.
 * Gibt bei ungültigen oder fehlenden Werten ein Platzhalterzeichen zurück.
 *
 * @function formatDatum
 * @param {string|number|Date|null|undefined} wert - Datumswert aus dem Backend
 * @returns {string} Formatiertes Datum oder "-"
 */
function formatDatum(wert) {
  if (!wert) {
    return '-';
  }

  const datum = new Date(wert);

  if (Number.isNaN(datum.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(datum);
}

/**
 * Formatiert ein Datum im deutschen Format mit Uhrzeit.
 * Gibt bei ungültigen oder fehlenden Werten ein Platzhalterzeichen zurück.
 *
 * @function formatDatumMitUhrzeit
 * @param {string|number|Date|null|undefined} wert - Datumswert aus dem Backend
 * @returns {string} Formatiertes Datum mit Uhrzeit oder "-"
 */
function formatDatumMitUhrzeit(wert) {
  if (!wert) {
    return '-';
  }

  const datum = new Date(wert);

  if (Number.isNaN(datum.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(datum);
}
