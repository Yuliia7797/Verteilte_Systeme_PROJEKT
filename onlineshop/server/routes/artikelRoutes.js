/**
 * Diese Datei definiert die API-Routen für die Artikelverwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET    /artikel          – alle Artikel laden (optional mit Filter)
 * - GET    /artikel/:id      – einzelnen Artikel mit Kategorie und Lagerbestand laden
 * - POST   /artikel          – neuen Artikel anlegen
 * - PUT    /artikel/:id      – vorhandenen Artikel aktualisieren
 * - DELETE /artikel/:id      – Artikel löschen
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');
const multer = require('multer');
const path = require('path');
const istAdmin = require('../istAdmin');

/*
  Speicherort und Dateiname für hochgeladene Bilder festlegen.
*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/images/produkte'));
  },
  filename: (req, file, cb) => {
    const eindeutigerName = `${Date.now()}-${file.originalname}`;
    cb(null, eindeutigerName);
  }
});

/*
  Upload-Middleware erstellen.
*/
const upload = multer({ storage });

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
    Zusätzlich wird die Kategorie-Tabelle eingebunden,
    damit auch der Kategoriename geladen werden kann.
  */
  let query = `
    SELECT
      artikel.*,
      kategorie.bezeichnung AS kategorie_name
    FROM artikel
    LEFT JOIN kategorie ON artikel.kategorie_id = kategorie.id
    WHERE 1 = 1
  `;
  const queryParams = [];

  /*
    Falls eine Kategorie ausgewählt wurde,
    nur Artikel dieser Kategorie laden.
  */
  if (kategorieId) {
    query += ' AND artikel.kategorie_id = ?';
    queryParams.push(kategorieId);
  }

  /*
    Falls ein Suchbegriff vorhanden ist,
    in mehreren Spalten nach diesem Begriff suchen.
  */
  if (suche) {
    query += `
      AND (
        artikel.bezeichnung LIKE ?
        OR artikel.beschreibung LIKE ?
        OR artikel.langbeschreibung LIKE ?
      )
    `;

    /*
      Der Suchbegriff wird mit % erweitert,
      damit auch Teiltreffer gefunden werden.
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
      artikel.kategorie_id,
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
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.post('/', istAdmin, upload.single('bild'), (req, res) => {
  /*
    Werte aus dem Request-Body auslesen.
  */
  const {
    kategorie_id,
    bezeichnung,
    beschreibung,
    preis,
    langbeschreibung
  } = req.body;

  /*
    Bildpfad vorbereiten, falls eine Datei hochgeladen wurde.
  */
  const bild_url = req.file ? `images/produkte/${req.file.filename}` : null;

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
    'INSERT INTO artikel (kategorie_id, bezeichnung, beschreibung, preis, bild_url, langbeschreibung) VALUES (?, ?, ?, ?, ?, ?)',
    [
      kategorie_id,
      bezeichnung,
      beschreibung || null,
      preis,
      bild_url,
      langbeschreibung || null
    ],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          message: 'Fehler beim Anlegen des Artikels'
        });
      }

      /*
        Neue Artikel-ID merken.
      */
      const neueArtikelId = results.insertId;

      /*
        Für den neuen Artikel automatisch einen Lagerbestand
        mit Anzahl 0 anlegen.
      */
      connection.query(
        'INSERT INTO lagerbestand (artikel_id, anzahl) VALUES (?, ?)',
        [neueArtikelId, 0],
        (lagerError) => {
          if (lagerError) {
            console.error(lagerError);
            return res.status(500).json({
              message: 'Artikel wurde angelegt, aber Lagerbestand konnte nicht erstellt werden'
            });
          }

          /*
            Erfolgsmeldung mit neuer Artikel-ID zurückgeben.
          */
          res.status(201).json({
            message: 'Artikel angelegt',
            id: neueArtikelId
          });
        }
      );
    }
  );
});

/*
  PUT /artikel/:id
  Aktualisiert einen vorhandenen Artikel anhand seiner ID.
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.put('/:id', istAdmin, upload.single('bild'), (req, res) => {
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
    Werte aus dem Request-Body auslesen.
  */
  const {
    kategorie_id,
    bezeichnung,
    beschreibung,
    preis,
    langbeschreibung,
    aktuelles_bild_url
  } = req.body;

  /*
    Prüfen, ob ein neues Bild hochgeladen wurde.
    Wenn nein, bleibt das bisherige Bild erhalten.
  */
  const bild_url = req.file
    ? `images/produkte/${req.file.filename}`
    : (aktuelles_bild_url || null);

  /*
    Pflichtfelder prüfen.
  */
  if (!kategorie_id || !bezeichnung || !preis) {
    return res.status(400).json({
      message: 'kategorie_id, bezeichnung und preis sind Pflichtfelder'
    });
  }

  /*
    Artikel in der Datenbank aktualisieren.
  */
  const query = `
    UPDATE artikel
    SET
      kategorie_id = ?,
      bezeichnung = ?,
      beschreibung = ?,
      preis = ?,
      bild_url = ?,
      langbeschreibung = ?
    WHERE id = ?
  `;

  connection.query(
    query,
    [
      kategorie_id,
      bezeichnung,
      beschreibung || null,
      preis,
      bild_url,
      langbeschreibung || null,
      artikelId
    ],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          message: 'Fehler beim Aktualisieren des Artikels'
        });
      }

      /*
        Prüfen, ob wirklich ein Artikel geändert wurde.
      */
      if (results.affectedRows === 0) {
        return res.status(404).json({
          message: 'Artikel nicht gefunden'
        });
      }

      /*
        Erfolgsmeldung zurückgeben.
      */
      res.status(200).json({
        message: 'Artikel erfolgreich aktualisiert'
      });
    }
  );
});

/*
  DELETE /artikel/:id
  Löscht einen Artikel anhand seiner ID.
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.delete('/:id', istAdmin, (req, res) => {
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
    Zuerst abhängige Datensätze löschen,
    danach den Artikel selbst löschen.
  */
  connection.query(
    'DELETE FROM warenkorb_position WHERE artikel_id = ?',
    [artikelId],
    (warenkorbError) => {
      if (warenkorbError) {
        console.error(warenkorbError);
        return res.status(500).json({
          message: 'Fehler beim Löschen der Warenkorb-Positionen'
        });
      }

      connection.query(
        'DELETE FROM lagerbestand WHERE artikel_id = ?',
        [artikelId],
        (lagerError) => {
          if (lagerError) {
            console.error(lagerError);
            return res.status(500).json({
              message: 'Fehler beim Löschen des Lagerbestands'
            });
          }

          connection.query(
            'DELETE FROM bestellposition WHERE artikel_id = ?',
            [artikelId],
            (bestellungError) => {
              if (bestellungError) {
                console.error(bestellungError);
                return res.status(500).json({
                  message: 'Fehler beim Löschen der Bestellpositionen'
                });
              }

              connection.query(
                'DELETE FROM artikel WHERE id = ?',
                [artikelId],
                (artikelError, results) => {
                  if (artikelError) {
                    console.error(artikelError);
                    return res.status(500).json({
                      message: 'Fehler beim Löschen des Artikels'
                    });
                  }

                  if (results.affectedRows === 0) {
                    return res.status(404).json({
                      message: 'Artikel nicht gefunden'
                    });
                  }

                  res.status(200).json({
                    message: 'Artikel erfolgreich gelöscht'
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;