/*
  Datei: forms.js
  Beschreibung: Zentrale Hilfsfunktionen zum Lesen, Setzen und Zurücksetzen von Formularfeldern
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Liefert ein Formularfeld anhand seiner ID.
 *
 * @function getFormField
 * @param {string} id - ID des Feldes
 * @returns {HTMLElement|null} Gefundenes Element oder null
 */
function getFormField(id) {
  return document.getElementById(id);
}

/**
 * Liest den Wert eines Formularfelds aus.
 *
 * @function getInputValue
 * @param {string} id - ID des Feldes
 * @param {boolean} [trim=true] - Ob der Wert getrimmt werden soll
 * @returns {string} Feldwert oder leerer String
 */
function getInputValue(id, trim = true) {
  const field = getFormField(id);

  if (!field || typeof field.value !== 'string') {
    return '';
  }

  return trim ? field.value.trim() : field.value;
}

/**
 * Setzt den Wert eines Formularfelds.
 *
 * @function setInputValue
 * @param {string} id - ID des Feldes
 * @param {string|number|null|undefined} value - Neuer Wert
 * @returns {void}
 */
function setInputValue(id, value) {
  const field = getFormField(id);

  if (!field || !('value' in field)) {
    return;
  }

  field.value = value ?? '';
}

/**
 * Liest mehrere Formularfelder anhand ihrer IDs aus.
 *
 * @function getFormValues
 * @param {string[]} ids - Liste von Feld-IDs
 * @param {boolean} [trim=true] - Ob Werte getrimmt werden sollen
 * @returns {Object} Objekt mit Feldwerten
 */
function getFormValues(ids, trim = true) {
  const values = {};

  ids.forEach((id) => {
    values[id] = getInputValue(id, trim);
  });

  return values;
}

/**
 * Setzt mehrere Formularfelder anhand eines Werteobjekts.
 *
 * @function setFormValues
 * @param {Object} values - Objekt mit Feld-ID als Key
 * @returns {void}
 */
function setFormValues(values) {
  Object.entries(values).forEach(([id, value]) => {
    setInputValue(id, value);
  });
}

/**
 * Leert mehrere Formularfelder.
 *
 * @function clearFormFields
 * @param {string[]} ids - Liste von Feld-IDs
 * @returns {void}
 */
function clearFormFields(ids) {
  ids.forEach((id) => {
    setInputValue(id, '');
  });
}

/**
 * Setzt ein Formular vollständig zurück.
 *
 * @function resetFormById
 * @param {string} formId - ID des Formulars
 * @returns {void}
 */
function resetFormById(formId) {
  const form = document.getElementById(formId);

  if (form && typeof form.reset === 'function') {
    form.reset();
  }
}

/**
 * Liest gemeinsame Adressdaten aus dem Formular.
 *
 * @function liesAdressdatenAusFormular
 * @param {Object} [options={}] - Optionen für zusätzliche Felder
 * @param {boolean} [options.mitTelefon=false] - Telefon mit auslesen
 * @param {boolean} [options.mitEmail=true] - E-Mail mit auslesen
 * @param {boolean} [options.mitVorname=true] - Vorname mit auslesen
 * @param {boolean} [options.mitNachname=true] - Nachname mit auslesen
 * @returns {Object} Gelesene Adressdaten
 */
function liesAdressdatenAusFormular(options = {}) {
  const {
    mitTelefon = false,
    mitEmail = true,
    mitVorname = true,
    mitNachname = true
  } = options;

  const adresse = {
    strasse: getInputValue('strasse'),
    hausnummer: getInputValue('hausnummer'),
    adresszusatz: getInputValue('adresszusatz'),
    postleitzahl: getInputValue('postleitzahl'),
    ort: getInputValue('ort'),
    land: getInputValue('land')
  };

  if (mitVorname) {
    adresse.vorname = getInputValue('vorname');
  }

  if (mitNachname) {
    adresse.nachname = getInputValue('nachname');
  }

  if (mitEmail) {
    adresse.email = getInputValue('email');
  }

  if (mitTelefon) {
    adresse.telefon = getInputValue('telefon');
  }

  return adresse;
}

/**
 * Schreibt gemeinsame Adressdaten in das Formular.
 *
 * @function fuelleAdressdatenInsFormular
 * @param {Object|null|undefined} adresse - Adressobjekt
 * @param {Object} [options={}] - Optionen für zusätzliche Felder
 * @param {boolean} [options.mitTelefon=false] - Telefon mit setzen
 * @param {boolean} [options.mitEmail=true] - E-Mail mit setzen
 * @param {boolean} [options.mitVorname=true] - Vorname mit setzen
 * @param {boolean} [options.mitNachname=true] - Nachname mit setzen
 * @returns {void}
 */
function fuelleAdressdatenInsFormular(adresse, options = {}) {
  if (!adresse) {
    return;
  }

  const {
    mitTelefon = false,
    mitEmail = true,
    mitVorname = true,
    mitNachname = true
  } = options;

  const values = {
    strasse: adresse.strasse ?? '',
    hausnummer: adresse.hausnummer ?? '',
    adresszusatz: adresse.adresszusatz ?? '',
    postleitzahl: adresse.postleitzahl ?? '',
    ort: adresse.ort ?? '',
    land: adresse.land ?? ''
  };

  if (mitVorname) {
    values.vorname = adresse.vorname ?? '';
  }

  if (mitNachname) {
    values.nachname = adresse.nachname ?? '';
  }

  if (mitEmail) {
    values.email = adresse.email ?? '';
  }

  if (mitTelefon) {
    values.telefon = adresse.telefon ?? '';
  }

  setFormValues(values);
}

/**
 * Leert gemeinsame Adressdaten im Formular.
 *
 * @function leereAdressdatenImFormular
 * @param {Object} [options={}] - Optionen für zusätzliche Felder
 * @param {boolean} [options.mitTelefon=false] - Telefon mit leeren
 * @param {boolean} [options.mitEmail=true] - E-Mail mit leeren
 * @param {boolean} [options.mitVorname=true] - Vorname mit leeren
 * @param {boolean} [options.mitNachname=true] - Nachname mit leeren
 * @returns {void}
 */
function leereAdressdatenImFormular(options = {}) {
  const {
    mitTelefon = false,
    mitEmail = true,
    mitVorname = true,
    mitNachname = true
  } = options;

  const ids = [
    'strasse',
    'hausnummer',
    'adresszusatz',
    'postleitzahl',
    'ort',
    'land'
  ];

  if (mitVorname) {
    ids.push('vorname');
  }

  if (mitNachname) {
    ids.push('nachname');
  }

  if (mitEmail) {
    ids.push('email');
  }

  if (mitTelefon) {
    ids.push('telefon');
  }

  clearFormFields(ids);
}