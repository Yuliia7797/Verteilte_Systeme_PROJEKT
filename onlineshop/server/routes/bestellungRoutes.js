/**
 * Diese Datei definiert die API-Routen für die Bestellverwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET   /bestellung              – alle Bestellungen mit Benutzerdaten laden
 * - GET   /bestellung/:id          – einzelne Bestellung mit Lieferadresse und Positionen laden
 * - POST  /bestellung              – neue Bestellung erstellen, Preise serverseitig berechnen,
 *                                    automatisch Worker-Aufgaben anlegen und Warenkorb leeren
 * - PATCH /bestellung/:id/status   – Bestellstatus aktualisieren
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  Prüft, ob ein Benutzer eingeloggt ist.
*/
function requireLogin(req, res, next) {
  if (!req.session || !req.session.benutzer || !req.session.benutzer.id) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
  }

  next();
}

/*
  GET /bestellung
  Lädt alle Bestellungen mit Benutzerdaten.
*/
router.get('/', (req, res) => {
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
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ungültige ID' });
  }

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

      if (bestellungResult.length === 0) {
        return res.status(404).json({ message: 'Bestellung nicht gefunden' });
      }

      connection.query(
        `SELECT bp.anzahl, bp.einzelpreis, bp.gesamtpreis,
                ar.id AS artikel_id, ar.bezeichnung AS artikel, ar.bild_url
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
  Erstellt eine neue Bestellung mit allen Positionen,
  legt danach automatisch Aufgaben an und leert den Warenkorb.
*/
router.post('/', requireLogin, (req, res) => {
  const benutzerId = req.session.benutzer.id;
  const { lieferadresse_id, zahlungsmethode, positionen } = req.body;

  if (!lieferadresse_id || !zahlungsmethode || !positionen || positionen.length === 0) {
    return res.status(400).json({
      message: 'lieferadresse_id, zahlungsmethode und positionen sind Pflichtfelder'
    });
  }

  const artikelIds = positionen.map((p) => p.artikel_id);

  connection.query(
    'SELECT id, preis FROM artikel WHERE id IN (?)',
    [artikelIds],
    (error, artikelResult) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Laden der Artikelpreise' });
      }

      const preisMap = {};
      artikelResult.forEach((a) => {
        preisMap[a.id] = parseFloat(a.preis);
      });

      let gesamtpreis = 0;

      for (const pos of positionen) {
        if (!preisMap[pos.artikel_id]) {
          return res.status(400).json({ message: 'Artikel ' + pos.artikel_id + ' nicht gefunden' });
        }

        gesamtpreis += preisMap[pos.artikel_id] * pos.anzahl;
      }

      gesamtpreis = Math.round(gesamtpreis * 100) / 100;

      connection.query(
        `INSERT INTO bestellung
         (benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode, zahlungsstatus, bestellstatus)
         VALUES (?, ?, ?, ?, 'ausstehend', 'neu')`,
        [benutzerId, lieferadresse_id, gesamtpreis, zahlungsmethode],
        (error, bestellungResult) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Fehler beim Erstellen der Bestellung' });
          }

          const bestellung_id = bestellungResult.insertId;

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

              const aufgaben = [
                [bestellung_id, null, 'zahlung_pruefen', 'wartend'],
                [bestellung_id, null, 'lager_aktualisieren', 'wartend'],
                [bestellung_id, null, 'bestaetigung_senden', 'wartend']
              ];

              connection.query(
                'INSERT INTO aufgabe (bestellung_id, worker_id, typ, status) VALUES ?',
                [aufgaben],
                (aufgabenError) => {
                  if (aufgabenError) {
                    console.error(aufgabenError);
                  }

                  connection.query(
                    'SELECT id FROM warenkorb WHERE benutzer_id = ? LIMIT 1',
                    [benutzerId],
                    (warenkorbError, warenkorbResult) => {
                      if (warenkorbError) {
                        console.error(warenkorbError);
                        return res.status(201).json({
                          message: 'Bestellung erfolgreich erstellt, Warenkorb konnte nicht geleert werden',
                          bestellung_id,
                          gesamtpreis
                        });
                      }

                      if (warenkorbResult.length === 0) {
                        return res.status(201).json({
                          message: 'Bestellung erfolgreich erstellt',
                          bestellung_id,
                          gesamtpreis
                        });
                      }

                      const warenkorbId = warenkorbResult[0].id;

                      connection.query(
                        'DELETE FROM warenkorb_position WHERE warenkorb_id = ?',
                        [warenkorbId],
                        (deleteError) => {
                          if (deleteError) {
                            console.error(deleteError);
                            return res.status(201).json({
                              message: 'Bestellung erfolgreich erstellt, Warenkorb konnte nicht geleert werden',
                              bestellung_id,
                              gesamtpreis
                            });
                          }

                          connection.query(
                            'UPDATE warenkorb SET gesamtpreis = 0.00, aenderungszeitpunkt = NOW() WHERE id = ?',
                            [warenkorbId],
                            (updateWarenkorbError) => {
                              if (updateWarenkorbError) {
                                console.error(updateWarenkorbError);
                                return res.status(201).json({
                                  message: 'Bestellung erfolgreich erstellt, Warenkorb konnte nicht vollständig aktualisiert werden',
                                  bestellung_id,
                                  gesamtpreis
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
  const id = Number.parseInt(req.params.id, 10);
  const { bestellstatus } = req.body;

  if (!Number.isInteger(id) || !bestellstatus) {
    return res.status(400).json({ message: 'Ungültige ID oder fehlender bestellstatus' });
  }

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