/**
 * Datei: test/escapeHtml.test.js
 * Beschreibung:
 *   Unit-Tests für die escapeHtml-Hilfsfunktion aus worker.js.
 *   Die Funktion schützt E-Mail-Templates vor XSS, indem sie
 *   HTML-Sonderzeichen in Datenbankwerten maskiert.
 *
 * Ausführen:
 *   npm test
 *
 * Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
 */

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

/**
 * Dieselbe escapeHtml-Funktion wie in worker.js – hier isoliert testbar.
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

test('escapeHtml: normaler Text bleibt unverändert', () => {
  assert.equal(escapeHtml('Harry Potter'), 'Harry Potter');
});

test('escapeHtml: < und > werden maskiert', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
});

test('escapeHtml: & wird maskiert', () => {
  assert.equal(escapeHtml('Tolkien & Friends'), 'Tolkien &amp; Friends');
});

test('escapeHtml: Anführungszeichen werden maskiert', () => {
  assert.equal(escapeHtml('"Titel"'), '&quot;Titel&quot;');
  assert.equal(escapeHtml("Leas Buch"), "Leas Buch");
  assert.equal(escapeHtml("it's"), "it&#x27;s");
});

test('escapeHtml: vollständiger XSS-Angriff wird entschärft', () => {
  const boeserArtikelname = '<img src=x onerror="alert(\'XSS\')">';
  const ergebnis = escapeHtml(boeserArtikelname);
  // Tag-Grenzen müssen maskiert sein → Browser rendert es als Text, nicht als HTML
  assert.doesNotMatch(ergebnis, /<img/);   // kein echtes öffnendes Tag mehr
  assert.doesNotMatch(ergebnis, />/);      // kein schließendes > mehr
  assert.match(ergebnis, /&lt;img/);       // < wurde zu &lt;
  assert.match(ergebnis, /&gt;/);          // > wurde zu &gt;
  // "onerror" als Wort bleibt – aber als Text, nicht als HTML-Attribut
  assert.match(ergebnis, /onerror/);
});

test('escapeHtml: Zahlen werden zu Strings konvertiert', () => {
  assert.equal(escapeHtml(42), '42');
});
