/*
  Datei: api.js
  Beschreibung: Diese Datei bündelt die zentrale Kommunikation mit dem Backend.
    Sie stellt Hilfsfunktionen für GET-, POST-, PUT-, PATCH- und DELETE-Anfragen bereit
    und vereinheitlicht dabei Fehlerbehandlung, Header, JSON-Verarbeitung,
    Formularübertragung sowie das Verhalten bei nicht eingeloggten Benutzern.
    Dadurch wird redundanter fetch-Code in mehreren Dateien vermieden.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 07.04.2026
*/

'use strict';

/**
 * Prüft, ob ein Wert ein FormData-Objekt ist.
 *
 * @function istFormData
 * @param {*} wert - Zu prüfender Wert
 * @returns {boolean} true, wenn es sich um FormData handelt, sonst false
 */
function istFormData(wert) {
  return typeof FormData !== 'undefined' && wert instanceof FormData;
}

/**
 * Baut die Optionen für einen fetch-Aufruf zusammen.
 * JSON-Daten werden automatisch serialisiert.
 * Bei FormData werden keine Content-Type-Header gesetzt,
 * damit der Browser den richtigen Multipart-Header selbst ergänzt.
 *
 * @function baueFetchOptionen
 * @param {string} methode - HTTP-Methode
 * @param {Object} [optionen={}] - Zusätzliche Optionen
 * @param {*} [optionen.body] - Request-Body
 * @param {Object} [optionen.headers={}] - Zusätzliche Header
 * @param {string} [optionen.credentials='same-origin'] - Credentials-Strategie
 * @returns {Object} Fertige fetch-Optionen
 */
function baueFetchOptionen(methode, optionen = {}) {
  const {
    body,
    headers = {},
    credentials = 'same-origin'
  } = optionen;

  const fetchOptionen = {
    method: methode,
    credentials,
    headers: { ...headers }
  };

  if (body !== undefined && body !== null) {
    if (istFormData(body)) {
      fetchOptionen.body = body;
    } else {
      fetchOptionen.body = JSON.stringify(body);
      fetchOptionen.headers['Content-Type'] = 'application/json';
    }
  }

  return fetchOptionen;
}

/**
 * Versucht, die Antwort des Servers als JSON zu lesen.
 * Falls kein JSON vorliegt, wird null zurückgegeben.
 *
 * @async
 * @function leseJsonAntwort
 * @param {Response} response - Fetch-Response
 * @returns {Promise<Object|Array|null>} Gelesene JSON-Daten oder null
 */
async function leseJsonAntwort(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    console.error('JSON-Antwort konnte nicht gelesen werden:', error);
    return null;
  }
}

/**
 * Behandelt eine 401-Antwort zentral.
 * Optional erfolgt eine Weiterleitung auf die Loginseite.
 *
 * @function behandleUnauthorized
 * @param {boolean} [weiterleitenBei401=true] - Gibt an, ob zur Loginseite weitergeleitet werden soll
 * @returns {void}
 */
function behandleUnauthorized(weiterleitenBei401 = true) {
  if (!weiterleitenBei401) {
    return;
  }

  if (typeof window.weiterleiten === 'function') {
    window.weiterleiten('/static/login.html');
  } else {
    window.location.href = '/static/login.html';
  }
}

/**
 * Führt einen zentralen API-Request aus und behandelt Fehler konsistent.
 *
 * @async
 * @function apiRequest
 * @param {string} url - Ziel-URL des Requests
 * @param {string} methode - HTTP-Methode
 * @param {Object} [optionen={}] - Zusätzliche Optionen
 * @param {*} [optionen.body] - Request-Body
 * @param {Object} [optionen.headers={}] - Zusätzliche Header
 * @param {string} [optionen.credentials='same-origin'] - Credentials-Strategie
 * @param {boolean} [optionen.weiterleitenBei401=true] - Weiterleitung bei 401
 * @param {boolean} [optionen.erwarteJson=true] - Gibt an, ob eine JSON-Antwort erwartet wird
 * @returns {Promise<*>} Antwortdaten, Response-Objekt oder null
 * @throws {Error} Wenn der Request fehlschlägt
 */
async function apiRequest(url, methode, optionen = {}) {
  const {
    weiterleitenBei401 = true,
    erwarteJson = true
  } = optionen;

  const fetchOptionen = baueFetchOptionen(methode, optionen);
  const response = await fetch(url, fetchOptionen);

  if (response.status === 401) {
    behandleUnauthorized(weiterleitenBei401);
    throw new Error('Nicht eingeloggt.');
  }

  const daten = await leseJsonAntwort(response);

  if (!response.ok) {
    const fehlertext =
      (daten && daten.message) ||
      `Fehler bei der Anfrage (${response.status}).`;

    throw new Error(fehlertext);
  }

  if (!erwarteJson) {
    return response;
  }

  return daten;
}

/**
 * Führt einen GET-Request aus.
 *
 * @async
 * @function apiGet
 * @param {string} url - Ziel-URL
 * @param {Object} [optionen={}] - Zusätzliche Optionen
 * @returns {Promise<*>} Antwortdaten
 */
async function apiGet(url, optionen = {}) {
  return await apiRequest(url, 'GET', optionen);
}

/**
 * Führt einen POST-Request aus.
 *
 * @async
 * @function apiPost
 * @param {string} url - Ziel-URL
 * @param {*} body - Request-Body
 * @param {Object} [optionen={}] - Zusätzliche Optionen
 * @returns {Promise<*>} Antwortdaten
 */
async function apiPost(url, body, optionen = {}) {
  return await apiRequest(url, 'POST', {
    ...optionen,
    body
  });
}

/**
 * Führt einen PUT-Request aus.
 *
 * @async
 * @function apiPut
 * @param {string} url - Ziel-URL
 * @param {*} body - Request-Body
 * @param {Object} [optionen={}] - Zusätzliche Optionen
 * @returns {Promise<*>} Antwortdaten
 */
async function apiPut(url, body, optionen = {}) {
  return await apiRequest(url, 'PUT', {
    ...optionen,
    body
  });
}

/**
 * Führt einen PATCH-Request aus.
 *
 * @async
 * @function apiPatch
 * @param {string} url - Ziel-URL
 * @param {*} body - Request-Body
 * @param {Object} [optionen={}] - Zusätzliche Optionen
 * @returns {Promise<*>} Antwortdaten
 */
async function apiPatch(url, body, optionen = {}) {
  return await apiRequest(url, 'PATCH', {
    ...optionen,
    body
  });
}

/**
 * Führt einen DELETE-Request aus.
 *
 * @async
 * @function apiDelete
 * @param {string} url - Ziel-URL
 * @param {Object} [optionen={}] - Zusätzliche Optionen
 * @returns {Promise<*>} Antwortdaten
 */
async function apiDelete(url, optionen = {}) {
  return await apiRequest(url, 'DELETE', optionen);
}

window.istFormData = istFormData;
window.baueFetchOptionen = baueFetchOptionen;
window.leseJsonAntwort = leseJsonAntwort;
window.behandleUnauthorized = behandleUnauthorized;
window.apiRequest = apiRequest;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiPatch = apiPatch;
window.apiDelete = apiDelete;