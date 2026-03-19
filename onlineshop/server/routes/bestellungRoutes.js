'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /bestellung
  Lädt alle Bestellungen mit Benutzerdaten.
*/
router.get('/', (req, res) => {
  /*
    Alle Bestellungen laden und zusätzlich
    Vorname, Nachname und E-Mail des Benutzers abrufen.
  */
  connection.query(
    `SELECT b.id, b.gesamtpreis, b.zahlungsmethode, b.zahlungsstatus,
            b.bestellstatus, b.erstellungszeitpunkt,
            bn.vorname, bn.nachname, bn.email
     FROM bestellung b
     JOIN benutzer bn ON b.benutzer_id = bn.id
     ORDER BY b.erstellungszeitpunkt DESC`,
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      res.status(200).json(results);
    }
  );
});

/*
  GET /bestellung/:id
  Lädt eine einzelne Bestellung mit Benutzerdaten,
  Lieferadresse und Bestellpositionen.
*/
router.get('/:id', (req, res) => {
  // Bestell-ID aus der URL lesen
  const id = Number.parseInt(req.params.id, 10);

  // Prüfen, ob die ID gültig ist
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ungültige ID' });
  }

  /*
    Zuerst die eigentliche Bestellung laden,
    zusammen mit Benutzer und Lieferadresse.
  */
  connection.query(
    `SELECT b.*, bn.vorname, bn.nachname, bn.email,
            a.strasse, a.hausnummer, a.postleitzahl, a.ort, a.land
     FROM bestellung b
     JOIN benutzer bn ON b.benutzer_id = bn.id
     JOIN adresse a ON b.lieferadresse_id = a.id
     WHERE b.id = ?`,
    [id],
    (error, bestellungResult) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      // Prüfen, ob die Bestellung existiert
      if (bestellungResult.length === 0) {
        return res.status(404).json({ message: 'Bestellung nicht gefunden' });
      }

      /*
        Danach alle Positionen dieser Bestellung laden,
        inklusive Artikelbezeichnung.
      */
      connection.query(
        `SELECT bp.anzahl, bp.einzelpreis, bp.gesamtpreis,
                ar.bezeichnung AS artikel
         FROM bestellposition bp
         JOIN artikel ar ON bp.artikel_id = ar.id
         WHERE bp.bestellung_id = ?`,
        [id],
        (error, positionenResult) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Datenbankfehler bei Positionen' });
          }

          res.status(200).json({
            bestellung: bestellungResult[0],
            positionen: positionenResult
          });
        }
      );
    }
  );
});

/*
  POST /bestellung
  Erstellt eine neue Bestellung mit allen Positionen
  und legt danach automatisch Aufgaben an.
*/
router.post('/', (req, res) => {
  // Daten aus dem Request-Body lesen
  const { benutzer_id, lieferadresse_id, zahlungsmethode, positionen } = req.body;

  // Prüfen, ob alle Pflichtfelder vorhanden sind
  if (!benutzer_id || !lieferadresse_id || !zahlungsmethode || !positionen || positionen.length === 0) {
    return res.status(400).json({
      message: 'benutzer_id, lieferadresse_id, zahlungsmethode und positionen sind Pflichtfelder'
    });
  }

  // Alle Artikel-IDs aus den Bestellpositionen sammeln
  const artikelIds = positionen.map((p) => p.artikel_id);

  /*
    Preise der Artikel laden, damit der Gesamtpreis
    korrekt berechnet werden kann.
  */
  connection.query(
    'SELECT id, preis FROM artikel WHERE id IN (?)',
    [artikelIds],
    (error, artikelResult) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Laden der Artikelpreise' });
      }

      // Preis-Mapping aufbauen: artikel_id -> preis
      const preisMap = {};
      artikelResult.forEach((a) => {
        preisMap[a.id] = parseFloat(a.preis);
      });

      // Gesamtpreis berechnen
      let gesamtpreis = 0;

      for (const pos of positionen) {
        if (!preisMap[pos.artikel_id]) {
          return res.status(400).json({ message: 'Artikel ' + pos.artikel_id + ' nicht gefunden' });
        }

        gesamtpreis += preisMap[pos.artikel_id] * pos.anzahl;
      }

      // Gesamtpreis auf zwei Nachkommastellen runden
      gesamtpreis = Math.round(gesamtpreis * 100) / 100;

      /*
        Neue Bestellung in der Tabelle "bestellung" speichern.
      */
      connection.query(
        `INSERT INTO bestellung
        (benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode, zahlungsstatus, bestellstatus)
        VALUES (?, ?, ?, ?, 'ausstehend', 'neu')`,
        [benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode],
        (error, bestellungResult) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Fehler beim Erstellen der Bestellung' });
          }

          const bestellung_id = bestellungResult.insertId;

          /*
            Danach alle Bestellpositionen vorbereiten
            und gesammelt speichern.
          */
          const positionenWerte = positionen.map((pos) => [
            bestellung_id,
            pos.artikel_id,
            pos.anzahl,
            preisMap[pos.artikel_id],
            preisMap[pos.artikel_id] * pos.anzahl
          ]);

          connection.query(
            `INSERT INTO bestellposition
            (bestellung_id, artikel_id, anzahl, einzelpreis, gesamtpreis)
            VALUES ?`,
            [positionenWerte],
            (error) => {
              if (error) {
                console.error(error);
                return res.status(500).json({ message: 'Fehler beim Speichern der Positionen' });
              }

              /*
                Nach dem Speichern der Bestellung
                automatische Aufgaben für Worker anlegen.
              */
              const aufgaben = [
                [bestellung_id, null, 'zahlung_pruefen', 'wartend'],
                [bestellung_id, null, 'lager_aktualisieren', 'wartend'],
                [bestellung_id, null, 'bestaetigung_senden', 'wartend']
              ];

              connection.query(
                'INSERT INTO aufgabe (bestellung_id, worker_id, typ, status) VALUES ?',
                [aufgaben],
                (error) => {
                  if (error) {
                    console.error(error);
                    return res.status(201).json({
                      message: 'Bestellung erstellt, Aufgaben konnten nicht angelegt werden',
                      bestellung_id
                    });
                  }

                  res.status(201).json({
                    message: 'Bestellung erfolgreich erstellt',
                    bestellung_id,
                    gesamtpreis
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

/*
  PATCH /bestellung/:id/status
  Aktualisiert den Status einer Bestellung.
*/
router.patch('/:id/status', (req, res) => {
  // Bestell-ID aus der URL lesen
  const id = Number.parseInt(req.params.id, 10);
  const { bestellstatus } = req.body;

  // Prüfen, ob ID und neuer Status vorhanden sind
  if (!Number.isInteger(id) || !bestellstatus) {
    return res.status(400).json({ message: 'Ungültige ID oder fehlender bestellstatus' });
  }

  // Bestellstatus in der Datenbank aktualisieren
  connection.query(
    'UPDATE bestellung SET bestellstatus = ? WHERE id = ?',
    [bestellstatus, id],
    (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Aktualisieren' });
      }

      res.status(200).json({ message: 'Status aktualisiert auf: ' + bestellstatus });
    }
  );
});

module.exports = router;