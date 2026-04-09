/**
 * Diese Datei definiert die API-Routen für die Bestellverwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET   /bestellung              – alle Bestellungen mit Benutzerdaten laden
 * - GET   /bestellung/:id          – einzelne Bestellung mit Lieferadresse und Positionen laden
 * - POST  /bestellung              – neue Bestellung erstellen, Preise serverseitig berechnen
 *                                    und Worker-Aufgaben für Lager, Warenkorb und Bestellstatus anlegen
 * - PATCH /bestellung/:id/status   – Bestellstatus aktualisieren
 */

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const connection = require('../db');
const istAdmin = require('../istAdmin');

const RECHNUNGEN_DIR = '/usr/src/rechnungen';

/**
 * Prüft, ob ein Benutzer eingeloggt ist.
 *
 * @function requireLogin
 * @param {Object} req - Express Request
 * @param {Object} res - Express Response
 * @param {Function} next - Express Next-Funktion
 * @returns {void}
 */
function requireLogin(req, res, next) {
  if (!req.session || !req.session.benutzer || !req.session.benutzer.id) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
  }

  next();
}

/**
 * Holt eine einzelne Verbindung aus dem Pool.
 *
 * @function getConnection
 * @returns {Promise<Object>} Datenbankverbindung
 */
function getConnection() {
  return new Promise((resolve, reject) => {
    connection.getConnection((error, conn) => {
      if (error) {
        reject(error);
      } else {
        resolve(conn);
      }
    });
  });
}

/**
 * Führt eine SQL-Abfrage über eine bestehende Verbindung aus.
 *
 * @function queryWithConnection
 * @param {Object} conn - Datenbankverbindung
 * @param {string} sql - SQL-Abfrage
 * @param {Array<any>} [params=[]] - Parameter der SQL-Abfrage
 * @returns {Promise<any>} SQL-Ergebnis
 */
function queryWithConnection(conn, sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * Startet eine Transaktion.
 *
 * @function beginTransaction
 * @param {Object} conn - Datenbankverbindung
 * @returns {Promise<void>}
 */
function beginTransaction(conn) {
  return new Promise((resolve, reject) => {
    conn.beginTransaction((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Bestätigt eine Transaktion.
 *
 * @function commitTransaction
 * @param {Object} conn - Datenbankverbindung
 * @returns {Promise<void>}
 */
function commitTransaction(conn) {
  return new Promise((resolve, reject) => {
    conn.commit((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Führt einen Rollback einer Transaktion aus.
 *
 * @function rollbackTransaction
 * @param {Object} conn - Datenbankverbindung
 * @returns {Promise<void>}
 */
function rollbackTransaction(conn) {
  return new Promise((resolve) => {
    conn.rollback(() => {
      resolve();
    });
  });
}

/**
 * Prüft, ob eine Lieferadresse zum aktuellen Benutzer gehört.
 *
 * @async
 * @function pruefeLieferadresse
 * @param {Object} conn - Datenbankverbindung
 * @param {number} lieferadresseId - ID der Lieferadresse
 * @param {number} benutzerId - ID des Benutzers
 * @returns {Promise<boolean>} true, wenn die Adresse dem Benutzer gehört
 */
async function pruefeLieferadresse(conn, lieferadresseId, benutzerId) {
  const result = await queryWithConnection(
    conn,
    `SELECT id
     FROM adresse
     WHERE id = ?
       AND benutzer_id = ?
     LIMIT 1`,
    [lieferadresseId, benutzerId]
  );

  return result.length > 0;
}

/**
 * Lädt Artikelpreise und Lagerbestände für die übergebenen Artikel-IDs.
 * Es werden nur aktive Artikel geladen.
 *
 * @async
 * @function ladeArtikelDaten
 * @param {Object} conn - Datenbankverbindung
 * @param {Array<number>} artikelIds - Liste der Artikel-IDs
 * @returns {Promise<Array<Object>>} Artikel mit Preis und Lagerbestand
 */
async function ladeArtikelDaten(conn, artikelIds) {
  return queryWithConnection(
    conn,
    `SELECT a.id, a.preis, l.anzahl AS lagerbestand
     FROM artikel a
     LEFT JOIN lagerbestand l ON a.id = l.artikel_id
     WHERE a.id IN (?)
       AND a.ist_aktiv = 1`,
    [artikelIds]
  );
}

/**
 * Validiert die Bestellpositionen und berechnet den Gesamtpreis.
 *
 * @async
 * @function validierePositionenUndBerechneGesamtpreis
 * @param {Array<Object>} positionen - Bestellpositionen aus dem Request
 * @param {Array<Object>} artikelResult - Geladene Artikeldaten
 * @returns {Promise<Object>} Objekt mit artikelMap und gesamtpreis
 */
async function validierePositionenUndBerechneGesamtpreis(positionen, artikelResult) {
  const artikelMap = {};

  artikelResult.forEach((artikel) => {
    artikelMap[artikel.id] = {
      preis: parseFloat(artikel.preis),
      lagerbestand: artikel.lagerbestand !== null
        ? Number.parseInt(artikel.lagerbestand, 10)
        : 0
    };
  });

  let gesamtpreis = 0;

  for (const pos of positionen) {
    const artikelId = Number.parseInt(pos.artikel_id, 10);
    const anzahl = Number.parseInt(pos.anzahl, 10);

    if (!Number.isInteger(artikelId) || !Number.isInteger(anzahl) || anzahl <= 0) {
      throw new Error('Ungültige Bestellposition');
    }

    if (!artikelMap[artikelId]) {
      throw new Error(`Artikel ${artikelId} nicht gefunden`);
    }

    if (artikelMap[artikelId].lagerbestand < anzahl) {
      throw new Error(`Für Artikel ${artikelId} ist nicht genügend Lagerbestand vorhanden`);
    }

    gesamtpreis += artikelMap[artikelId].preis * anzahl;
  }

  gesamtpreis = Math.round(gesamtpreis * 100) / 100;

  return {
    artikelMap,
    gesamtpreis
  };
}

/**
 * Erstellt eine Bestellung in der Datenbank.
 *
 * @async
 * @function erstelleBestellung
 * @param {Object} conn - Datenbankverbindung
 * @param {number} benutzerId - Benutzer-ID
 * @param {number} lieferadresseId - Lieferadresse-ID
 * @param {number} gesamtpreis - Gesamtpreis der Bestellung
 * @param {string} zahlungsmethode - Zahlungsmethode
 * @returns {Promise<number>} ID der neuen Bestellung
 */
async function erstelleBestellung(conn, benutzerId, lieferadresseId, gesamtpreis, zahlungsmethode) {
  const result = await queryWithConnection(
    conn,
    `INSERT INTO bestellung
     (benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode, zahlungsstatus, bestellstatus)
     VALUES (?, ?, ?, ?, 'bezahlt', 'neu')`,
    [benutzerId, lieferadresseId, gesamtpreis, zahlungsmethode]
  );

  return result.insertId;
}

/**
 * Speichert alle Bestellpositionen für eine Bestellung.
 *
 * @async
 * @function speichereBestellpositionen
 * @param {Object} conn - Datenbankverbindung
 * @param {number} bestellungId - ID der Bestellung
 * @param {Array<Object>} positionen - Bestellpositionen
 * @param {Object} artikelMap - Artikel-Mapping mit Preisen
 * @returns {Promise<void>}
 */
async function speichereBestellpositionen(conn, bestellungId, positionen, artikelMap) {
  const positionenWerte = positionen.map((pos) => {
    const artikelId = Number.parseInt(pos.artikel_id, 10);
    const anzahl = Number.parseInt(pos.anzahl, 10);
    const einzelpreis = artikelMap[artikelId].preis;
    const gesamtpreis = Math.round(einzelpreis * anzahl * 100) / 100;

    return [
      bestellungId,
      artikelId,
      anzahl,
      einzelpreis,
      gesamtpreis
    ];
  });

  await queryWithConnection(
    conn,
    `INSERT INTO bestellposition
     (bestellung_id, artikel_id, anzahl, einzelpreis, gesamtpreis)
     VALUES ?`,
    [positionenWerte]
  );
}

/**
 * Reduziert den Lagerbestand aller Artikel einer Bestellung innerhalb
 * der laufenden Transaktion, sodass kein anderer Vorgang dazwischenfunken kann.
 *
 * @async
 * @function aktualisiereLagerbestand
 * @param {Object} conn - Datenbankverbindung
 * @param {Array<Object>} positionen - Bestellpositionen aus dem Request
 * @returns {Promise<void>}
 */
async function aktualisiereLagerbestand(conn, positionen) {
  for (const pos of positionen) {
    const artikelId = Number.parseInt(pos.artikel_id, 10);
    const anzahl = Number.parseInt(pos.anzahl, 10);

    await queryWithConnection(
      conn,
      "UPDATE lagerbestand SET anzahl = anzahl - ? WHERE artikel_id = ?",
      [anzahl, artikelId]
    );
  }
}

/**
 * Legt die zwei Standard-Aufgaben für eine neue Bestellung an.
 * Die Aufgaben werden bewusst nur als "wartend" angelegt.
 * Der Controller übernimmt später die Verteilung an freie Worker.
 *
 * @async
 * @function legeAufgabenAn
 * @param {Object} conn - Datenbankverbindung
 * @param {number} bestellungId - ID der Bestellung
 * @returns {Promise<void>}
 */
async function legeAufgabenAn(conn, bestellungId) {
  const aufgaben = [
    [bestellungId, null, 'bestellstatus_aktualisieren', 'wartend'],
    [bestellungId, null, 'warenkorb_leeren', 'wartend'],
    [bestellungId, null, 'bestellBestaetigung_senden', 'wartend'],
    [bestellungId, null, 'rechnung_erstellen', 'wartend']
  ];

  await queryWithConnection(
    conn,
    `INSERT INTO aufgabe (bestellung_id, worker_id, typ, status)
     VALUES ?`,
    [aufgaben]
  );
}

/**
 * GET /bestellung
 * Lädt alle Bestellungen mit Benutzerdaten.
 * Dieser Endpunkt darf nur von Admins genutzt werden.
 */
router.get('/', istAdmin, (req, res) => {
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

/**
 * GET /bestellung/:id
 * Lädt eine einzelne Bestellung mit Benutzerdaten,
 * Lieferadresse und Bestellpositionen.
 * Admins sehen alle Bestellungen, Kunden nur ihre eigenen.
 */
router.get('/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ungültige ID' });
  }

  const benutzer = req.session && req.session.benutzer;

  if (!benutzer) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
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

      const istEigeneBestellung = bestellungResult[0].benutzer_id === benutzer.id;
      const istAdminBenutzer = benutzer.rolle === 'admin';

      if (!istEigeneBestellung && !istAdminBenutzer) {
        return res.status(403).json({ message: 'Kein Zugriff auf diese Bestellung' });
      }

      connection.query(
        `SELECT bp.anzahl, bp.einzelpreis, bp.gesamtpreis,
                ar.id AS artikel_id, ar.bezeichnung AS artikel, ar.bild_url
         FROM bestellposition bp
         JOIN artikel ar ON bp.artikel_id = ar.id
         WHERE bp.bestellung_id = ?`,
        [id],
        (positionenError, positionenResult) => {
          if (positionenError) {
            console.error(positionenError);
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

/**
 * POST /bestellung
 * Erstellt eine neue Bestellung mit allen Positionen
 * und legt danach Worker-Aufgaben für Lager, Warenkorb und Bestellstatus an.
 */
router.post('/', requireLogin, async (req, res) => {
  const benutzerId = req.session.benutzer.id;
  const lieferadresseId = Number.parseInt(req.body.lieferadresse_id, 10);
  const zahlungsmethode = req.body.zahlungsmethode;
  const positionen = Array.isArray(req.body.positionen) ? req.body.positionen : [];

  if (!Number.isInteger(lieferadresseId) || !zahlungsmethode || positionen.length === 0) {
    return res.status(400).json({
      message: 'lieferadresse_id, zahlungsmethode und positionen sind Pflichtfelder'
    });
  }

  const erlaubteZahlungsmethoden = ['bankkonto', 'paypal'];

  if (!erlaubteZahlungsmethoden.includes(zahlungsmethode)) {
    return res.status(400).json({
      message: 'Ungültige Zahlungsmethode'
    });
  }

  const artikelIds = positionen.map((pos) => Number.parseInt(pos.artikel_id, 10));

  if (artikelIds.some((artikelId) => !Number.isInteger(artikelId))) {
    return res.status(400).json({ message: 'Ungültige Artikel-ID in den Positionen' });
  }

  let conn;

  try {
    conn = await getConnection();
    await beginTransaction(conn);

    const adresseGueltig = await pruefeLieferadresse(conn, lieferadresseId, benutzerId);

    if (!adresseGueltig) {
      await rollbackTransaction(conn);
      conn.release();

      return res.status(403).json({
        message: 'Die Lieferadresse gehört nicht zum eingeloggten Benutzer'
      });
    }

    const artikelResult = await ladeArtikelDaten(conn, artikelIds);
    const { artikelMap, gesamtpreis } =
      await validierePositionenUndBerechneGesamtpreis(positionen, artikelResult);

    const bestellungId = await erstelleBestellung(
      conn,
      benutzerId,
      lieferadresseId,
      gesamtpreis,
      zahlungsmethode
    );

    await speichereBestellpositionen(conn, bestellungId, positionen, artikelMap);
    await aktualisiereLagerbestand(conn, positionen);
    await legeAufgabenAn(conn, bestellungId);

    await commitTransaction(conn);
    conn.release();

    res.status(201).json({
      message: 'Bestellung erfolgreich erstellt',
      bestellung_id: bestellungId,
      gesamtpreis: gesamtpreis
    });
  } catch (error) {
    console.error(error);

    if (conn) {
      await rollbackTransaction(conn);
      conn.release();
    }

    if (
      error.message &&
      (
        error.message.startsWith('Artikel ') ||
        error.message === 'Ungültige Bestellposition' ||
        error.message.includes('Lagerbestand')
      )
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Fehler beim Erstellen der Bestellung' });
  }
});

/**
 * PATCH /bestellung/:id/status
 * Aktualisiert den Status einer Bestellung.
 * Dieser Endpunkt darf nur von Admins genutzt werden.
 */
router.patch('/:id/status', istAdmin, (req, res) => {
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

/**
 * GET /bestellung/:id/rechnung
 * Lädt die PDF-Rechnung einer Bestellung herunter.
 * Eigene Bestellungen: eingeloggter Benutzer. Alle: nur Admin.
 */
router.get('/:id/rechnung', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ungültige ID' });
  }

  const benutzer = req.session && req.session.benutzer;

  if (!benutzer) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
  }

  connection.query(
    'SELECT benutzer_id FROM bestellung WHERE id = ? LIMIT 1',
    [id],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      if (!results.length) {
        return res.status(404).json({ message: 'Bestellung nicht gefunden' });
      }

      const istEigeneBestellung = results[0].benutzer_id === benutzer.id;
      const istAdminBenutzer = benutzer.rolle === 'admin';

      if (!istEigeneBestellung && !istAdminBenutzer) {
        return res.status(403).json({ message: 'Kein Zugriff auf diese Rechnung' });
      }

      const dateiPfad = path.join(RECHNUNGEN_DIR, `rechnung_${id}.pdf`);

      if (!fs.existsSync(dateiPfad)) {
        return res.status(404).json({ message: 'Rechnung noch nicht verfügbar' });
      }

      res.download(dateiPfad, `rechnung_${id}.pdf`);
    }
  );
});

module.exports = router;