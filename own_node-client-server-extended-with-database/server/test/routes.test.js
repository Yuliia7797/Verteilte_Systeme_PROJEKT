'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

// ─── Rate Limiter ───────────────────────────────────────────────────────────
test('Rate Limiter ist vorhanden', () => {
    assert.match(source, /express-rate-limit/);
});

// ─── Artikel Routen ─────────────────────────────────────────────────────────
test('Artikel Routen sind definiert', () => {
    assert.match(source, /app\.get\('\/artikel'/);
    assert.match(source, /app\.get\('\/artikel\/:id'/);
    assert.match(source, /app\.post\('\/artikel'/);
    assert.match(source, /app\.delete\('\/artikel\/:id'/);
});

// ─── Kategorien Routen ──────────────────────────────────────────────────────
test('Kategorien Route ist definiert', () => {
    assert.match(source, /app\.get\('\/kategorien'/);
});

// ─── Warenkorb Routen ───────────────────────────────────────────────────────
test('Warenkorb Routen sind definiert', () => {
    assert.match(source, /app\.get\('\/warenkorb\/:benutzer_id'/);
    assert.match(source, /app\.post\('\/warenkorb'/);
    assert.match(source, /app\.delete\('\/warenkorb\/position\/:id'/);
});

// ─── Bestellung Routen ──────────────────────────────────────────────────────
test('Bestellung Routen sind definiert', () => {
    assert.match(source, /app\.get\('\/bestellung'/);
    assert.match(source, /app\.get\('\/bestellung\/:id'/);
    assert.match(source, /app\.post\('\/bestellung'/);
    assert.match(source, /app\.patch\('\/bestellung\/:id\/status'/);
});

// ─── Lagerbestand Routen ────────────────────────────────────────────────────
test('Lagerbestand Routen sind definiert', () => {
    assert.match(source, /app\.get\('\/lagerbestand'/);
    assert.match(source, /app\.patch\('\/lagerbestand\/:artikel_id'/);
});

// ─── Worker Routen ──────────────────────────────────────────────────────────
test('Worker Routen sind definiert', () => {
    assert.match(source, /app\.get\('\/worker'/);
    assert.match(source, /app\.get\('\/aufgaben'/);
});

// ─── Benutzer Routen ────────────────────────────────────────────────────────
test('Benutzer Routen sind definiert', () => {
    assert.match(source, /app\.get\('\/benutzer'/);
    assert.match(source, /app\.post\('\/benutzer'/);
});

// ─── Adresse Routen ─────────────────────────────────────────────────────────
test('Adresse Routen sind definiert', () => {
    assert.match(source, /app\.get\('\/adresse\/:benutzer_id'/);
    assert.match(source, /app\.post\('\/adresse'/);
    assert.match(source, /app\.put\('\/adresse\/:id'/);
    assert.match(source, /app\.delete\('\/adresse\/:id'/);
});

// ─── Datenbankverbindung ────────────────────────────────────────────────────
test('Datenbankverbindung ist konfiguriert', () => {
    assert.match(source, /mysql\.createPool/);
    assert.match(source, /MYSQL_HOSTNAME/);
    assert.match(source, /MYSQL_USER/);
    assert.match(source, /MYSQL_PASSWORD/);
    assert.match(source, /MYSQL_DATABASE/);
});