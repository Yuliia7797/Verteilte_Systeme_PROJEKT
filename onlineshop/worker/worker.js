/*
  Datei: worker.js
  Beschreibung:
    Diese Datei steuert die Hintergrundverarbeitung von Aufgaben (Worker-System).

    Der Worker verbindet sich mit der Datenbank, registriert sich als aktiver Worker
    und prüft in regelmäßigen Abständen auf neue Aufgaben.

    Folgende Aufgaben werden verarbeitet:
    - Warenkorb eines Benutzers nach erfolgreicher Bestellung leeren
    - Bestellstatus nach erfolgreicher Bestellung aktualisieren
    - Bestellbestätigung per E-Mail an den Kunden senden
    - PDF-Rechnung generieren und im gemeinsamen Volume ablegen

    Zusätzlich meldet der Worker Statusänderungen in Echtzeit an den
    Socket.IO-Server, damit Admin-Bereich und Benutzerkonto
    sofort aktualisiert werden können.

    Hinweis:
    Die Aktualisierung des Lagerbestands erfolgt derzeit nicht im Worker,
    sondern direkt im Bestellprozess.

    Der Worker verwendet ein Transaktionssystem, um sicherzustellen,
    dass jede Aufgabe nur von einem Worker gleichzeitig verarbeitet wird.
    Zusätzlich überwacht er andere Worker über Heartbeats.

  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

// =========================
// Imports & Konfiguration
// =========================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const { io } = require('socket.io-client');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const RECHNUNGEN_DIR = '/usr/src/rechnungen';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false
});

const dbInfo = {
  connectionLimit: 10,
  host: process.env.MYSQL_HOSTNAME,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

const pool = mysql.createPool(dbInfo);
let workerId = null;

// Verbindung direkt mit dem Server-Service innerhalb des Docker-Netzwerks.
// Der Worker benötigt keinen Zugriff über nginx, da er ein interner Dienst ist.
// Es wird ausschließlich echter WebSocket-Transport verwendet.
const socket = io('http://server:8080', {
  transports: ['websocket']
});

console.log('Worker startet und verbindet sich mit der Datenbank...');

// =========================
// Socket-Helfer
// =========================

/**
 * Maskiert HTML-Sonderzeichen in einem String, um XSS in E-Mail-Templates zu verhindern.
 * Muss auf alle Datenbankwerte angewendet werden, die in HTML eingebettet werden.
 *
 * @function escapeHtml
 * @param {string} text - Zu maskierender Text
 * @returns {string} HTML-sicherer Text
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sendet ein Echtzeit-Ereignis an den Socket.IO-Server.
 *
 * @function sendeSocketEvent
 * @param {string} eventName - Name des Eingangsereignisses auf dem Server
 * @param {Object} payload - Zu sendende Daten
 * @returns {void}
 */
function sendeSocketEvent(eventName, payload) {
  if (!socket || !socket.connected) {
    console.warn(`Socket nicht verbunden. Ereignis "${eventName}" konnte nicht gesendet werden.`);
    return;
  }

  socket.emit(eventName, payload);
}

// Log-Ausgaben für die Socket-Verbindung
socket.on('connect', function () {
  console.log('Socket-Verbindung hergestellt:', socket.id);
});

socket.on('disconnect', function () {
  console.log('Socket-Verbindung getrennt');
});

socket.on('connect_error', function (error) {
  console.error('Socket-Verbindungsfehler:', error.message);
});

// =========================
// Datenbank-Helfer
// =========================

/**
 * Führt eine SQL-Abfrage über den Connection-Pool aus.
 *
 * @function query
 * @param {string} sql - SQL-Abfrage
 * @param {Array<any>} [params=[]] - Parameter für die Abfrage
 * @returns {Promise<any>} Ergebnis der SQL-Abfrage
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, function (error, results) {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * Holt eine einzelne Datenbankverbindung aus dem Pool.
 *
 * @function getConnection
 * @returns {Promise<any>} Datenbankverbindung
 */
function getConnection() {
  return new Promise((resolve, reject) => {
    pool.getConnection(function (err, connection) {
      if (err) {
        reject(err);
      } else {
        resolve(connection);
      }
    });
  });
}

// =========================
// Worker-Registrierung & Überwachung
// =========================

/**
 * Registriert den Worker in der Tabelle "worker".
 * Der Worker meldet sich als aktiver allgemeiner Worker an.
 *
 * @async
 * @function registerWorker
 * @returns {Promise<void>}
 */
async function registerWorker() {
  const result = await query(
    "INSERT INTO worker (typ, status, letzter_heartbeat) VALUES ('allgemein', 'aktiv', NOW())"
  );

  workerId = result.insertId;
  console.log('Worker registriert mit ID:', workerId);

  // Nach der Registrierung den aktuellen Worker-Status in Echtzeit melden
  sendeSocketEvent('worker_event', {
    workerId: workerId,
    status: 'aktiv'
  });
}

/**
 * Sendet einen Heartbeat für den aktuellen Worker.
 *
 * @async
 * @function sendHeartbeat
 * @returns {Promise<void>}
 */
async function sendHeartbeat() {
  if (!workerId) {
    return;
  }

  await query(
    "UPDATE worker SET letzter_heartbeat = NOW() WHERE id = ?",
    [workerId]
  );

  // Optionaler Echtzeit-Hinweis, dass der Worker noch lebt
  sendeSocketEvent('worker_event', {
    workerId: workerId,
    status: 'aktiv',
    heartbeat: true
  });
}

/**
 * Prüft, ob der aktuelle Worker noch als aktiv markiert ist.
 *
 * @async
 * @function istWorkerAktiv
 * @returns {Promise<boolean>} true, wenn der Worker aktiv ist
 */
async function istWorkerAktiv() {
  if (!workerId) {
    return false;
  }

  const results = await query(
    "SELECT status FROM worker WHERE id = ? LIMIT 1",
    [workerId]
  );

  if (!results.length) {
    return false;
  }

  return results[0].status === 'aktiv';
}

/**
 * Markiert den aktuellen Worker beim Beenden als inaktiv.
 *
 * @async
 * @function workerAbmelden
 * @returns {Promise<void>}
 */
async function workerAbmelden() {
  if (!workerId) {
    return;
  }

  try {
    await query(
      "UPDATE worker SET status = 'inaktiv' WHERE id = ?",
      [workerId]
    );

    sendeSocketEvent('worker_event', {
      workerId: workerId,
      status: 'inaktiv'
    });
  } catch (error) {
    console.error('Fehler beim Abmelden des Workers:', error.message);
  }
}

// =========================
// Task-Queue / Task-Status
// =========================

/**
 * Holt die nächste Aufgabe, die bereits diesem Worker vom Controller
 * zugewiesen wurde, und setzt sie atomar auf "in_bearbeitung".
 *
 * @async
 * @function getAssignedTask
 * @returns {Promise<Object|null>} Zugewiesene Aufgabe oder null
 */
async function getAssignedTask() {
  const workerAktiv = await istWorkerAktiv();

  if (!workerAktiv) {
    return null;
  }

  const conn = await getConnection();

  return new Promise((resolve, reject) => {
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        return reject(err);
      }

      conn.query(
        `SELECT *
         FROM aufgabe
         WHERE worker_id = ?
           AND status = 'zugewiesen'
         ORDER BY id ASC
         LIMIT 1
         FOR UPDATE`,
        [workerId],
        function (err, results) {
          if (err) {
            return conn.rollback(() => {
              conn.release();
              reject(err);
            });
          }

          if (results.length === 0) {
            return conn.rollback(() => {
              conn.release();
              resolve(null);
            });
          }

          const task = results[0];

          conn.query(
            `UPDATE aufgabe
             SET status = 'in_bearbeitung',
                 startzeitpunkt = NOW()
             WHERE id = ?
               AND worker_id = ?
               AND status = 'zugewiesen'`,
            [task.id, workerId],
            function (err, updateResult) {
              if (err) {
                return conn.rollback(() => {
                  conn.release();
                  reject(err);
                });
              }

              if (!updateResult.affectedRows) {
                return conn.rollback(() => {
                  conn.release();
                  resolve(null);
                });
              }

              conn.commit(function (err) {
                conn.release();

                if (err) {
                  return reject(err);
                }

                task.status = 'in_bearbeitung';
                task.startzeitpunkt = new Date();

                // Echtzeit-Meldung: Aufgabe wurde übernommen
                sendeSocketEvent('aufgabe_event', {
                  taskId: task.id,
                  bestellungId: task.bestellung_id,
                  typ: task.typ,
                  status: 'in_bearbeitung',
                  workerId: workerId
                });

                resolve(task);
              });
            }
          );
        }
      );
    });
  });
}

/**
 * Markiert eine Aufgabe als erfolgreich abgeschlossen.
 *
 * @async
 * @function markAsDone
 * @param {number} taskId - ID der Aufgabe
 * @param {number} bestellungId - Zugehörige Bestell-ID
 * @param {string} taskTyp - Typ der Aufgabe
 * @returns {Promise<void>}
 */
async function markAsDone(taskId, bestellungId, taskTyp) {
  await query(
    `UPDATE aufgabe
     SET status = 'abgeschlossen',
         endzeitpunkt = NOW()
     WHERE id = ?
       AND worker_id = ?
       AND status = 'in_bearbeitung'`,
    [taskId, workerId]
  );

  // Echtzeit-Meldung: Aufgabe erfolgreich abgeschlossen
  sendeSocketEvent('aufgabe_event', {
    taskId: taskId,
    bestellungId: bestellungId,
    typ: taskTyp,
    status: 'abgeschlossen',
    workerId: workerId
  });
}

/**
 * Markiert eine Aufgabe als fehlgeschlagen und erhöht die Anzahl der Versuche.
 *
 * @async
 * @function markAsFailed
 * @param {number} taskId - ID der Aufgabe
 * @param {number} bestellungId - Zugehörige Bestell-ID
 * @param {string} taskTyp - Typ der Aufgabe
 * @param {string} fehlermeldung - Fehlermeldung zur Aufgabe
 * @returns {Promise<void>}
 */
async function markAsFailed(taskId, bestellungId, taskTyp, fehlermeldung) {
  await query(
    `UPDATE aufgabe
     SET status = 'fehlgeschlagen',
         fehlermeldung = ?,
         endzeitpunkt = NOW(),
         versuch_anzahl = versuch_anzahl + 1
     WHERE id = ?
       AND worker_id = ?
       AND status = 'in_bearbeitung'`,
    [fehlermeldung, taskId, workerId]
  );

  // Echtzeit-Meldung: Aufgabe ist fehlgeschlagen
  sendeSocketEvent('aufgabe_event', {
    taskId: taskId,
    bestellungId: bestellungId,
    typ: taskTyp,
    status: 'fehlgeschlagen',
    workerId: workerId,
    fehlermeldung: fehlermeldung
  });
}

// =========================
// Shop-Aufgaben / Business-Logik
// =========================

/**
 * Leert den Warenkorb des Benutzers, der die Bestellung aufgegeben hat.
 *
 * @async
 * @function warenkorbLeeren
 * @param {number} bestellungId - ID der Bestellung
 * @returns {Promise<void>}
 */
async function warenkorbLeeren(bestellungId) {
  console.log('  -> Warenkorb leeren für Bestellung:', bestellungId);

  const bestellungResult = await query(
    "SELECT benutzer_id FROM bestellung WHERE id = ?",
    [bestellungId]
  );

  if (!bestellungResult.length) {
    throw new Error('Bestellung nicht gefunden');
  }

  const benutzerId = bestellungResult[0].benutzer_id;

  const warenkorbResult = await query(
    "SELECT id FROM warenkorb WHERE benutzer_id = ? LIMIT 1",
    [benutzerId]
  );

  if (!warenkorbResult.length) {
    return;
  }

  const warenkorbId = warenkorbResult[0].id;

  await query(
    "DELETE FROM warenkorb_position WHERE warenkorb_id = ?",
    [warenkorbId]
  );

  await query(
    "UPDATE warenkorb SET gesamtpreis = 0.00, aenderungszeitpunkt = NOW() WHERE id = ?",
    [warenkorbId]
  );
}

/**
 * Generiert eine PDF-Rechnung für eine Bestellung und speichert sie
 * im gemeinsamen Volume unter /usr/src/rechnungen/rechnung_<id>.pdf.
 *
 * @async
 * @function rechnungErstellen
 * @param {number} bestellungId - ID der Bestellung
 * @returns {Promise<void>}
 */
async function rechnungErstellen(bestellungId) {
  console.log('  -> Rechnung erstellen für Bestellung:', bestellungId);

  const bestellungResult = await query(
    `SELECT b.id, b.gesamtpreis, b.zahlungsmethode, b.erstellungszeitpunkt,
            bn.vorname, bn.nachname, bn.email,
            a.strasse, a.hausnummer, a.postleitzahl, a.ort, a.land
     FROM bestellung b
     JOIN benutzer bn ON b.benutzer_id = bn.id
     JOIN adresse a ON b.lieferadresse_id = a.id
     WHERE b.id = ?
     LIMIT 1`,
    [bestellungId]
  );

  if (!bestellungResult.length) {
    throw new Error('Bestellung nicht gefunden');
  }

  const b = bestellungResult[0];

  const positionen = await query(
    `SELECT bp.anzahl, bp.einzelpreis, bp.gesamtpreis, a.bezeichnung
     FROM bestellposition bp
     JOIN artikel a ON bp.artikel_id = a.id
     WHERE bp.bestellung_id = ?`,
    [bestellungId]
  );

  await fs.promises.mkdir(RECHNUNGEN_DIR, { recursive: true });

  const dateiPfad = path.join(RECHNUNGEN_DIR, `rechnung_${bestellungId}.pdf`);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(dateiPfad);

    doc.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);

    // Logo oben links
    const logoPath = '/usr/src/images/myshop-logo.png';
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { height: 50 });
    }

    // Kopfzeile rechts
    doc.fontSize(22).font('Helvetica-Bold').text('RECHNUNG', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`Rechnungsnummer: R-${bestellungId}`, { align: 'right' });
    doc.text(`Datum: ${new Date(b.erstellungszeitpunkt).toLocaleDateString('de-DE')}`, { align: 'right' });
    doc.moveDown(2);

    // Kundenadresse
    doc.font('Helvetica-Bold').text('Rechnungsempfänger:');
    doc.font('Helvetica').text(`${b.vorname} ${b.nachname}`);
    doc.text(`${b.strasse} ${b.hausnummer}`);
    doc.text(`${b.postleitzahl} ${b.ort}`);
    doc.text(b.land);
    doc.moveDown(2);

    // Tabellenkopf
    const colX = [50, 280, 360, 440];
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Artikel', colX[0], doc.y, { width: 220, continued: true });
    doc.text('Anzahl', colX[1], doc.y, { width: 70, continued: true });
    doc.text('Einzelpreis', colX[2], doc.y, { width: 80, continued: true });
    doc.text('Gesamt', colX[3], doc.y);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);

    // Positionen
    doc.font('Helvetica').fontSize(10);
    for (const pos of positionen) {
      const y = doc.y;
      doc.text(pos.bezeichnung, colX[0], y, { width: 220, continued: true });
      doc.text(String(pos.anzahl), colX[1], y, { width: 70, continued: true });
      doc.text(`${Number(pos.einzelpreis).toFixed(2)} EUR`, colX[2], y, { width: 80, continued: true });
      doc.text(`${Number(pos.gesamtpreis).toFixed(2)} EUR`, colX[3], y);
    }

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Gesamtbetrag
    doc.font('Helvetica-Bold').fontSize(11)
      .text(`Gesamtbetrag: ${Number(b.gesamtpreis).toFixed(2)} EUR`, { align: 'right' });
    doc.font('Helvetica').fontSize(10)
      .text(`Zahlungsmethode: ${b.zahlungsmethode}`, { align: 'right' });

    doc.end();
  });

  console.log('  ✓ Rechnung gespeichert:', dateiPfad);
}

/**
 * Lädt Bestelldaten und sendet eine Bestätigungs-E-Mail an den Kunden.
 *
 * @async
 * @function bestellBestaetigungSenden
 * @param {number} bestellungId - ID der Bestellung
 * @returns {Promise<void>}
 */
async function bestellBestaetigungSenden(bestellungId) {
  console.log('  -> Bestellbestätigung senden für Bestellung:', bestellungId);

  // Idempotenz-Check: E-Mail nur senden wenn noch nicht gesendet
  const flagResult = await query(
    'SELECT email_gesendet FROM bestellung WHERE id = ? LIMIT 1',
    [bestellungId]
  );

  if (flagResult.length && flagResult[0].email_gesendet) {
    console.log('  ✓ E-Mail bereits gesendet, wird übersprungen.');
    return;
  }

  const bestellungResult = await query(
    `SELECT b.id, b.gesamtpreis, b.zahlungsmethode, b.erstellungszeitpunkt,
            bn.vorname, bn.nachname, bn.email
     FROM bestellung b
     JOIN benutzer bn ON b.benutzer_id = bn.id
     WHERE b.id = ?
     LIMIT 1`,
    [bestellungId]
  );

  if (!bestellungResult.length) {
    throw new Error('Bestellung nicht gefunden');
  }

  const bestellung = bestellungResult[0];

  const positionen = await query(
    `SELECT bp.anzahl, bp.einzelpreis, bp.gesamtpreis, a.bezeichnung
     FROM bestellposition bp
     JOIN artikel a ON bp.artikel_id = a.id
     WHERE bp.bestellung_id = ?`,
    [bestellungId]
  );

  const positionenHtml = positionen.map(pos =>
    `<tr>
       <td>${escapeHtml(pos.bezeichnung)}</td>
       <td>${Number(pos.anzahl)}</td>
       <td>${Number(pos.einzelpreis).toFixed(2)} €</td>
       <td>${Number(pos.gesamtpreis).toFixed(2)} €</td>
     </tr>`
  ).join('');

  await transporter.sendMail({
    from: '"Onlineshop" <noreply@onlineshop.de>',
    to: bestellung.email,
    subject: `Bestellbestätigung #${bestellungId}`,
    html: `
      <h2>Vielen Dank für deine Bestellung, ${escapeHtml(bestellung.vorname)}!</h2>
      <p>Deine Bestellung <strong>#${bestellungId}</strong> ist eingegangen.</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr><th>Artikel</th><th>Anzahl</th><th>Einzelpreis</th><th>Gesamtpreis</th></tr>
        </thead>
        <tbody>${positionenHtml}</tbody>
      </table>
      <p><strong>Gesamtbetrag: ${Number(bestellung.gesamtpreis).toFixed(2)} €</strong></p>
      <p>Zahlungsmethode: ${escapeHtml(bestellung.zahlungsmethode)}</p>
    `
  });

  // Flag setzen – verhindert erneutes Senden bei Worker-Neustart
  await query(
    'UPDATE bestellung SET email_gesendet = 1 WHERE id = ?',
    [bestellungId]
  );

  console.log('  ✓ Bestätigungs-E-Mail gesendet an:', bestellung.email);
}

/**
 * Aktualisiert den Status einer Bestellung auf "bestaetigt".
 *
 * @async
 * @function bestellstatusAktualisieren
 * @param {number} bestellungId - ID der Bestellung
 * @returns {Promise<void>}
 */
async function bestellstatusAktualisieren(bestellungId) {
  console.log('  -> Bestellstatus aktualisieren:', bestellungId);

  await query(
    "UPDATE bestellung SET bestellstatus = 'bestaetigt' WHERE id = ?",
    [bestellungId]
  );

  // Echtzeit-Meldung: Bestellstatus wurde aktualisiert
  sendeSocketEvent('bestellung_event', {
    bestellungId: bestellungId,
    bestellstatus: 'bestaetigt'
  });
}

// =========================
// Aufgabenverarbeitung
// =========================

/**
 * Führt die Business-Logik für eine zugewiesene Aufgabe aus.
 *
 * @async
 * @function processTask
 * @param {Object} task - Aufgabe aus der Datenbank
 * @param {number} task.id - ID der Aufgabe
 * @param {string} task.typ - Typ der Aufgabe
 * @param {number} task.bestellung_id - Zugehörige Bestell-ID
 * @returns {Promise<void>}
 */
async function processTask(task) {
  console.log('Verarbeite Aufgabe:', task.id, task.typ);

  try {
    switch (task.typ) {
      case 'rechnung_erstellen':
        await rechnungErstellen(task.bestellung_id);
        break;

      case 'bestellBestaetigung_senden':
        await bestellBestaetigungSenden(task.bestellung_id);
        break;

      case 'warenkorb_leeren':
        await warenkorbLeeren(task.bestellung_id);
        break;

      case 'bestellstatus_aktualisieren':
        await bestellstatusAktualisieren(task.bestellung_id);
        break;

      default:
        throw new Error(`Unbekannter Typ: ${task.typ}`);
    }

    await markAsDone(task.id, task.bestellung_id, task.typ);
  } catch (error) {
    await markAsFailed(task.id, task.bestellung_id, task.typ, error.message);
  }
}

// =========================
// Worker-Laufzeit
// =========================

/**
 * Hauptschleife des Workers.
 * Der Worker verarbeitet nur Aufgaben, die bereits vom Controller
 * zugewiesen wurden.
 *
 * @async
 * @function workerLoop
 * @returns {Promise<void>}
 */
async function workerLoop() {
  console.log('Worker läuft...');

  while (true) {
    try {
      const task = await getAssignedTask();

      if (task) {
        await processTask(task);
      } else {
        process.stdout.write('.');
      }
    } catch (error) {
      console.error('Loop-Fehler:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

/**
 * Startet den Worker-Prozess mit automatischen Wiederholungsversuchen.
 *
 * @async
 * @function start
 * @returns {Promise<void>}
 */
async function start() {
  let versuch = 0;

  while (true) {
    try {
      versuch++;
      console.log(`Verbindungsversuch ${versuch}...`);

      await new Promise(resolve => setTimeout(resolve, 5000));
      await registerWorker();

      setInterval(async () => {
        try {
          await sendHeartbeat();
        } catch (error) {
          console.error('Heartbeat-Fehler:', error.message);
        }
      }, 15000);

      await workerLoop();
    } catch (error) {
      console.error('Start-Fehler:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// =========================
// Graceful Shutdown
// =========================

/**
 * Behandelt das saubere Beenden des Worker-Prozesses.
 *
 * @async
 * @function handleShutdown
 * @param {string} signal - Empfangendes Prozesssignal
 * @returns {Promise<void>}
 */
async function handleShutdown(signal) {
  console.log(`\nSignal empfangen: ${signal}. Worker wird sauber beendet...`);

  try {
    await workerAbmelden();
  } finally {
    socket.close();

    pool.end(function () {
      process.exit(0);
    });
  }
}

process.on('SIGINT', () => {
  handleShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  handleShutdown('SIGTERM');
});

start();