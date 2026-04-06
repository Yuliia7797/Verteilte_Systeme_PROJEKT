/*
  Datei: worker.js
  Beschreibung: Diese Datei steuert die Hintergrundverarbeitung von Aufgaben (Worker-System).
    Der Worker verbindet sich mit der Datenbank, registriert sich als aktiver Worker
    und prüft in regelmäßigen Abständen auf neue Aufgaben.

    Folgende Aufgaben werden verarbeitet:
    - Lagerbestand aktualisieren nach einer Bestellung
    - Warenkorb eines Benutzers nach erfolgreicher Bestellung leeren
    - Bestellstatus nach erfolgreicher Bestellung aktualisieren

    Der Worker verwendet ein Transaktionssystem, um sicherzustellen,
    dass jede Aufgabe nur von einem Worker gleichzeitig verarbeitet wird.
    Zusätzlich überwacht er andere Worker über Heartbeats und setzt
    hängengebliebene Aufgaben automatisch zurück.

  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/
'use strict';

// =========================
// Imports & Konfiguration
// =========================

const mysql = require('mysql');

const dbInfo = {
  connectionLimit: 10,
  host: process.env.MYSQL_HOSTNAME,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
};

const pool = mysql.createPool(dbInfo);
let workerId = null;

console.log('Worker startet und verbindet sich mit der Datenbank...');


// =========================
// Datenbank-Helfer
// =========================

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

async function registerWorker() {
  await query(
    `UPDATE aufgabe
     SET worker_id = NULL
     WHERE worker_id IN (
       SELECT id FROM worker WHERE status = 'inaktiv'
     )`
  );

  await query("DELETE FROM worker WHERE status = 'inaktiv'");

  const result = await query(
    "INSERT INTO worker (typ, status, letzter_heartbeat) VALUES ('allgemein', 'aktiv', NOW())"
  );

  workerId = result.insertId;
  console.log('Worker registriert mit ID:', workerId);
}

async function sendHeartbeat() {
  if (workerId) {
    await query(
      "UPDATE worker SET letzter_heartbeat = NOW() WHERE id = ?",
      [workerId]
    );
  }
}

async function markInaktiveWorker() {
  await query(
    `UPDATE worker
     SET status = 'inaktiv'
     WHERE status = 'aktiv'
       AND id != ?
       AND letzter_heartbeat < DATE_SUB(NOW(), INTERVAL 60 SECOND)`,
    [workerId]
  );
}

async function istWorkerAktiv() {
  const results = await query(
    "SELECT status FROM worker WHERE id = ? LIMIT 1",
    [workerId]
  );

  if (!results.length) {
    return false;
  }

  return results[0].status === 'aktiv';
}


// =========================
// Task-Queue / Task-Status
// =========================

async function getNextTask() {
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
        "SELECT * FROM aufgabe WHERE status = 'wartend' ORDER BY id ASC LIMIT 1 FOR UPDATE",
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
                 worker_id = ?,
                 startzeitpunkt = NOW()
             WHERE id = ?`,
            [workerId, task.id],
            function (err) {
              if (err) {
                return conn.rollback(() => {
                  conn.release();
                  reject(err);
                });
              }

              conn.commit(function (err) {
                conn.release();

                if (err) {
                  return reject(err);
                }

                resolve(task);
              });
            }
          );
        }
      );
    });
  });
}

async function markAsDone(taskId) {
  await query(
    "UPDATE aufgabe SET status = 'abgeschlossen', endzeitpunkt = NOW() WHERE id = ?",
    [taskId]
  );
}

async function markAsFailed(taskId, fehlermeldung) {
  await query(
    `UPDATE aufgabe
     SET status = 'fehlgeschlagen',
         fehlermeldung = ?,
         endzeitpunkt = NOW(),
         versuch_anzahl = versuch_anzahl + 1
     WHERE id = ?`,
    [fehlermeldung, taskId]
  );
}

async function resetHaengengebliebeneAufgaben() {
  await query(
    `UPDATE aufgabe
     SET status = 'wartend',
         worker_id = NULL,
         startzeitpunkt = NULL
     WHERE status = 'in_bearbeitung'
       AND startzeitpunkt < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
  );
}


// =========================
// Shop-Aufgaben / Business-Logik
// =========================

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

    console.log('  ✓ Lager reduziert:', pos.artikel_id, pos.anzahl);
  }
}

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

  if (!warenkorbResult.length) return;

  const warenkorbId = warenkorbResult[0].id;

  await query("DELETE FROM warenkorb_position WHERE warenkorb_id = ?", [warenkorbId]);

  await query(
    "UPDATE warenkorb SET gesamtpreis = 0.00, aenderungszeitpunkt = NOW() WHERE id = ?",
    [warenkorbId]
  );
}

async function bestellstatusAktualisieren(bestellungId) {
  console.log('  -> Bestellstatus aktualisieren:', bestellungId);

  await query(
    "UPDATE bestellung SET bestellstatus = 'bestaetigt' WHERE id = ?",
    [bestellungId]
  );
}


// =========================
// Aufgabenverarbeitung
// =========================

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

    await markAsDone(task.id);
  } catch (error) {
    await markAsFailed(task.id, error.message);
  }
}


// =========================
// Worker-Laufzeit
// =========================

async function workerLoop() {
  console.log('Worker läuft...');

  await resetHaengengebliebeneAufgaben();

  while (true) {
    try {
      const task = await getNextTask();

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

async function start() {
  let versuch = 0;

  while (true) {
    try {
      versuch++;
      console.log(`Verbindungsversuch ${versuch}...`);

      await new Promise(resolve => setTimeout(resolve, 5000));
      await registerWorker();

      setInterval(async () => {
        await sendHeartbeat();
        await markInaktiveWorker();
      }, 15000);

      await workerLoop();
    } catch (error) {
      console.error('Start-Fehler:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

start();