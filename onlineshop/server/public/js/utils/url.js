/*
  Datei: url.js
  Beschreibung: Zentrale Hilfsfunktionen zum Auslesen von URL-Parametern
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Liest einen Query-Parameter aus der aktuellen URL.
 *
 * @function getQueryParam
 * @param {string} name - Name des Parameters
 * @returns {string|null} Wert oder null
 */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Liest einen Query-Parameter und wandelt ihn in eine Zahl um.
 *
 * @function getIntQueryParam
 * @param {string} name - Name des Parameters
 * @returns {number|null} Zahl oder null
 */
function getIntQueryParam(name) {
  const value = getQueryParam(name);

  if (value === null) {
    return null;
  }

  const parsed = parseInt(value, 10);

  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Liest einen Pflicht-Parameter (String) oder wirft Fehler.
 *
 * @function requireQueryParam
 */
function requireQueryParam(name) {
  const value = getQueryParam(name);

  if (!value) {
    throw new Error(`URL-Parameter "${name}" fehlt.`);
  }

  return value;
}

/**
 * Liest einen Pflicht-Parameter als Integer oder wirft Fehler.
 *
 * @function requireIntQueryParam
 */
function requireIntQueryParam(name) {
  const value = getIntQueryParam(name);

  if (value === null) {
    throw new Error(`URL-Parameter "${name}" fehlt oder ist ungültig.`);
  }

  return value;
}