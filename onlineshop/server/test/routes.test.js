'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// ─── Dateien einlesen ───────────────────────────────────────────────────────
const serverSource     = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const artikelSource    = fs.readFileSync(path.join(__dirname, '..', 'routes', 'artikelRoutes.js'), 'utf8');
const kategorienSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'kategorienRoutes.js'), 'utf8');
const warenkorbSource  = fs.readFileSync(path.join(__dirname, '..', 'routes', 'warenkorbRoutes.js'), 'utf8');
const bestellungSource = fs.readFileSync(path.join(__dirname, '..', 'routes', 'bestellungRoutes.js'), 'utf8');
const lagerSource      = fs.readFileSync(path.join(__dirname, '..', 'routes', 'lagerbestandRoutes.js'), 'utf8');
const workerSource     = fs.readFileSync(path.join(__dirname, '..', 'routes', 'workerRoutes.js'), 'utf8');
const benutzerSource   = fs.readFileSync(path.join(__dirname, '..', 'routes', 'benutzerRoutes.js'), 'utf8');
const adresseSource    = fs.readFileSync(path.join(__dirname, '..', 'routes', 'adresseRoutes.js'), 'utf8');

// ─── server.js ──────────────────────────────────────────────────────────────
test('Rate Limiter ist vorhanden', () => {
    assert.match(serverSource, /express-rate-limit/);
});

test('Datenbankverbindung ist konfiguriert', () => {
    assert.match(serverSource, /require\('\.\/db'\)/);
});

test('Alle Router sind in server.js eingebunden', () => {
    assert.match(serverSource, /app\.use\('\/artikel'/);
    assert.match(serverSource, /app\.use\('\/kategorien'/);
    assert.match(serverSource, /app\.use\('\/warenkorb'/);
    assert.match(serverSource, /app\.use\('\/bestellung'/);
    assert.match(serverSource, /app\.use\('\/lagerbestand'/);
    assert.match(serverSource, /app\.use\('\/worker'/);
    assert.match(serverSource, /app\.use\('\/benutzer'/);
    assert.match(serverSource, /app\.use\('\/adresse'/);
});

// ─── Artikel Routen ─────────────────────────────────────────────────────────
test('Artikel Routen sind definiert', () => {
    assert.match(artikelSource, /router\.get\('\/'/);
    assert.match(artikelSource, /router\.get\('\/:id'/);
    assert.match(artikelSource, /router\.post\('\/'/);
    assert.match(artikelSource, /router\.delete\('\/:id'/);
});

// ─── Kategorien Routen ──────────────────────────────────────────────────────
test('Kategorien Route ist definiert', () => {
    assert.match(kategorienSource, /router\.get\('\/'/);
});

// ─── Warenkorb Routen ───────────────────────────────────────────────────────
test('Warenkorb Routen sind definiert', () => {
    assert.match(warenkorbSource, /router\.get\(/);
    assert.match(warenkorbSource, /router\.post\('\/positionen'/);
    assert.match(warenkorbSource, /router\.delete\(/);
});

// ─── Bestellung Routen ──────────────────────────────────────────────────────
test('Bestellung Routen sind definiert', () => {
    assert.match(bestellungSource, /router\.get\('\/'/);
    assert.match(bestellungSource, /router\.post\('\/'/);
    assert.match(bestellungSource, /router\.patch\(/);
});

test('ladeArtikelDaten verwendet FOR UPDATE (Race-Condition-Schutz)', () => {
    assert.match(bestellungSource, /FOR UPDATE/);
});

test('aktualisiereLagerbestand prüft Mindestbestand im UPDATE (negativer Bestand verhindert)', () => {
    assert.match(bestellungSource, /AND anzahl >= \?/);
    assert.match(bestellungSource, /affectedRows === 0/);
});

// ─── Lagerbestand Routen ────────────────────────────────────────────────────
test('Lagerbestand Routen sind definiert', () => {
    assert.match(lagerSource, /router\.get\('\/'/);
    assert.match(lagerSource, /router\.patch\(/);
});

// ─── Worker Routen ──────────────────────────────────────────────────────────
test('Worker Routen sind definiert', () => {
    assert.match(workerSource, /router\.get\('\/'/);
});

// ─── Benutzer Routen ────────────────────────────────────────────────────────
test('Benutzer Routen sind definiert', () => {
    assert.match(benutzerSource, /router\.get\('\/'/);
    assert.match(benutzerSource, /router\.post\('\/'/);
});

test('POST /benutzer hasht das Passwort mit bcrypt (kein Klartext in DB)', () => {
    assert.match(benutzerSource, /const \{ .* passwort,.* \} = req\.body/);
    assert.match(benutzerSource, /bcrypt\.hash\(passwort,/);
    assert.doesNotMatch(benutzerSource, /INSERT.*passwort_hash.*VALUES.*passwort_hash/);
});

test('POST /benutzer validiert die Rolle gegen eine Whitelist', () => {
    assert.match(benutzerSource, /erlaubteRollen/);
    assert.match(benutzerSource, /'kunde'.*'admin'|'admin'.*'kunde'/);
});

// ─── Adresse Routen ─────────────────────────────────────────────────────────
test('Adresse Routen sind definiert', () => {
    assert.match(adresseSource, /router\.get\(/);
    assert.match(adresseSource, /router\.post\('\/'/);
    assert.match(adresseSource, /router\.put\(/);
    assert.match(adresseSource, /router\.delete\(/);
});