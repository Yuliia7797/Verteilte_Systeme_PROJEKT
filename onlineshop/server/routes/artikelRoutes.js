/**
 * Diese Datei definiert die API-Routen für die Artikelverwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET    /artikel          – alle Artikel laden (optional mit Filter)
 * - GET    /artikel/:id      – einzelnen Artikel mit Kategorie und Lagerbestand laden
 * - POST   /artikel          – neuen Artikel anlegen
 * - DELETE /artikel/:id      – Artikel löschen
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /artikel
  Lädt alle Artikel.
  Optional kann gefiltert werden nach:
  - Kategorie: /artikel?kategorie_id=2
  - Suche: /artikel?suche=Harry
  - Beides zusammen: /artikel?kategorie_id=2&suche=Harry
*/
router.get('/', (req, res) => {
  /*
    Kategorie-ID aus der URL lesen.
    Beispiel: /artikel?kategorie_id=2
  */
  const kategorieId = req.query.kategorie_id;

  /*
    Suchbegriff aus der URL lesen.
    Beispiel: /artikel?suche=Harry
    Falls nichts übergeben wurde, leeren String verwenden.
  */
  const suche = req.query.suche ? req.query.suche.trim() : '';

  /*
    Grundabfrage vorbereiten.
    "WHERE 1 = 1" erleichtert das spätere Anhängen
    weiterer Bedingungen mit AND.
  */
  let query = 'SELECT * FROM artikel WHERE 1 = 1';
  const queryParams = [];

  /*
    Falls eine Kategorie ausgewählt wurde,
    nur Artikel dieser Kategorie laden.
  */
  if (kategorieId) {
    query += ' AND kategorie_id = ?';
    queryParams.push(kategorieId);
  }

  /*
    Falls ein Suchbegriff vorhanden ist,
    in mehreren Spalten nach diesem Begriff suchen.
  */
  if (suche) {
    query += `
      AND (
        bezeichnung LIKE ?
        OR beschreibung LIKE ?
        OR langbeschreibung LIKE ?
      )
    `;

    /*
      Der Suchbegriff wird mit % erweitert,
      damit auch Teiltreffer gefunden werden.
      Beispiel:
      "Harry" wird zu "%Harry%"
    */
    const suchbegriff = `%${suche}%`;

    /*
      Der gleiche Suchbegriff wird für alle drei Felder verwendet.
    */
    queryParams.push(suchbegriff, suchbegriff, suchbegriff);
  }

  /*
    SQL-Abfrage mit den gesammelten Parametern ausführen.
  */
  connection.query(query, queryParams, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Datenbankabfrage fehlgeschlagen'
      });
    }

    /*
      Gefundene Artikel als JSON zurückgeben.
    */
    res.status(200).json(results);
  });
});

/*
  GET /artikel/:id
  Lädt einen einzelnen Artikel anhand seiner ID.
*/
router.get('/:id', (req, res) => {
  /*
    Artikel-ID aus der URL lesen und in eine Zahl umwandeln.
  */
  const artikelId = Number.parseInt(req.params.id, 10);

  /*
    Prüfen, ob die ID gültig ist.
  */
  if (!Number.isInteger(artikelId)) {
    return res.status(400).json({
      message: 'Ungültige Artikel-ID'
    });
  }

  /*
    Einzelnen Artikel mit Kategorie und Lagerbestand laden.
  */
  const query = `
    SELECT
      artikel.id,
      artikel.bezeichnung,
      artikel.beschreibung,
      artikel.langbeschreibung,
      artikel.preis,
      artikel.bild_url,
      kategorie.bezeichnung AS kategorie_name,
      lagerbestand.anzahl AS lagerbestand
    FROM artikel
    LEFT JOIN kategorie ON artikel.kategorie_id = kategorie.id
    LEFT JOIN lagerbestand ON artikel.id = lagerbestand.artikel_id
    WHERE artikel.id = ?
  `;

  connection.query(query, [artikelId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Datenbankabfrage fehlgeschlagen'
      });
    }

    /*
      Falls kein Artikel gefunden wurde, 404 zurückgeben.
    */
    if (results.length === 0) {
      return res.status(404).json({
        message: 'Artikel nicht gefunden'
      });
    }

    /*
      Den gefundenen Artikel zurückgeben.
    */
    res.status(200).json(results[0]);
  });
});

/*
  POST /artikel
  Legt einen neuen Artikel an.
*/
router.post('/', (req, res) => {
  /*
    Werte aus dem Request-Body auslesen.
  */
  const {
    kategorie_id,
    bezeichnung,
    beschreibung,
    preis,
    bild_url
  } = req.body;

  /*
    Pflichtfelder prüfen.
  */
  if (!kategorie_id || !bezeichnung || !preis) {
    return res.status(400).json({
      message: 'kategorie_id, bezeichnung und preis sind Pflichtfelder'
    });
  }

  /*
    Neuen Artikel in die Datenbank einfügen.
  */
  connection.query(
    'INSERT INTO artikel (kategorie_id, bezeichnung, beschreibung, preis, bild_url) VALUES (?, ?, ?, ?, ?)',
    [kategorie_id, bezeichnung, beschreibung || null, preis, bild_url || null],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          message: 'Fehler beim Anlegen des Artikels'
        });
      }

      /*
        Erfolgsmeldung mit neuer Artikel-ID zurückgeben.
      */
      res.status(201).json({
        message: 'Artikel angelegt',
        id: results.insertId
      });
    }
  );
});

/*
  DELETE /artikel/:id
  Löscht einen Artikel anhand seiner ID.
*/
router.delete('/:id', (req, res) => {
  /*
    Artikel-ID aus der URL lesen und prüfen.
  */
  const artikelId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(artikelId)) {
    return res.status(400).json({
      message: 'Ungültige Artikel-ID'
    });
  }

  /*
    Artikel aus der Datenbank löschen.
  */
  connection.query(
    'DELETE FROM artikel WHERE id = ?',
    [artikelId],
    (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          message: 'Fehler beim Löschen'
        });
      }

      /*
        Erfolgsmeldung zurückgeben.
      */
      res.status(200).json({
        message: 'Artikel gelöscht'
      });
    }
  );
});

module.exports = router;