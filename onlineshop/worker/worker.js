/*
  Datei: worker.js
  Beschreibung:
    Diese Datei steuert die Hintergrundverarbeitung von Aufgaben (Worker-System).

    Der Worker verbindet sich mit der Datenbank, registriert sich als aktiver Worker
    und prüft in regelmäßigen Abständen auf neue Aufgaben.

    Folgende Aufgaben werden verarbeitet:
    - Lagerbestand aktualisieren nach einer Bestellung
    - Warenkorb eines Benutzers nach erfolgreicher Bestellung leeren
    - Bestellstatus nach erfolgreicher Bestellung aktualisieren

    Zusätzlich meldet der Worker Statusänderungen in Echtzeit an den
    Socket.IO-Server, damit Admin-Bereich, Benutzerkonto und Lageranzeige
    sofort aktualisiert werden können.

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

const mysql = require('mysql');
const { io } = require('socket.io-client');

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
 * Reduziert den Lagerbestand aller Artikel einer Bestellung.
 *
 * @async
 * @function lagerAktualisieren
 * @param {number} bestellungId - ID der Bestellung
 * @returns {Promise<void>}
 */
async function lagerAktualisieren(bestellungId) {
  console.log('  -> Lagerbestand aktualisieren für Bestellung:', bestellungId);

  const positionen = await query(
    "SELECT artikel_id, anzahl FROM bestellposition WHERE bestellung_id = ?",
    [bestellungId]
  );

  for (const pos of positionen) {
    await query(
      "UPDATE lagerbestand SET anzahl = anzahl - ? WHERE artikel_id = ?",
      [pos.anzahl, pos.artikel_id]
    );

    // Aktuellen Lagerbestand nach der Änderung erneut lesen,
    // damit das Frontend den exakten neuen Wert kennt.
    const lagerResult = await query(
      "SELECT anzahl FROM lagerbestand WHERE artikel_id = ? LIMIT 1",
      [pos.artikel_id]
    );

    const neuerBestand = lagerResult.length ? lagerResult[0].anzahl : 0;

    console.log('  ✓ Lager reduziert:', pos.artikel_id, pos.anzahl);

    // Echtzeit-Meldung: Lagerbestand eines Artikels wurde geändert
    sendeSocketEvent('lager_event', {
      artikelId: pos.artikel_id,
      lagerbestand: neuerBestand,
      bestellungId: bestellungId
    });
  }
}

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
      case 'lager_aktualisieren':
        await lagerAktualisieren(task.bestellung_id);
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