/*
  Datei: controller.js
  Beschreibung:
    Diese Datei implementiert den Controller für das Worker-System.

    Der Controller übernimmt die zentrale Koordination zwischen Aufgaben
    (aufgabe) und Workern (worker). Er überwacht Worker anhand von Heartbeats,
    gibt blockierte Aufgaben frei und verteilt neue Aufgaben an freie Worker.

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
    host:     process.env.MYSQL_HOSTNAME,
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

const pool = mysql.createPool(dbInfo);

console.log("Controller startet und verbindet sich mit der Datenbank...");


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
            if (error) reject(error);
            else resolve(results);
        });
    });
}


// =========================
// Aufgaben & Worker abrufen
// =========================

/**
 * Holt die nächste wartende Aufgabe.
 *
 * @async
 * @function getWaitingTask
 * @returns {Promise<Object|null>} Nächste Aufgabe oder null
 */
async function getWaitingTask() {
    const results = await query(
        `SELECT *
         FROM aufgabe
         WHERE status = 'wartend'
         ORDER BY id ASC
         LIMIT 1`
    );

    return results.length ? results[0] : null;
}

/**
 * Holt einen freien aktiven Worker.
 * Ein Worker ist frei, wenn er keine Aufgabe bearbeitet.
 *
 * @async
 * @function getFreeWorker
 * @returns {Promise<Object|null>} Freier Worker oder null
 */
async function getFreeWorker() {
    const results = await query(
        `SELECT *
         FROM worker
         WHERE status = 'aktiv'
         AND id NOT IN (
             SELECT worker_id
             FROM aufgabe
             WHERE status IN ('zugewiesen', 'in_bearbeitung')
             AND worker_id IS NOT NULL
         )
         ORDER BY id ASC
         LIMIT 1`
    );

    return results.length ? results[0] : null;
}


// =========================
// Aufgabenverwaltung
// =========================

/**
 * Weist eine Aufgabe einem Worker zu.
 * Setzt den Status von 'wartend' auf 'zugewiesen'.
 *
 * @async
 * @function assignTaskToWorker
 * @param {number} taskId - ID der Aufgabe
 * @param {number} workerId - ID des Workers
 * @returns {Promise<void>}
 */
async function assignTaskToWorker(taskId, workerId) {
    await query(
        `UPDATE aufgabe
         SET worker_id = ?, status = 'zugewiesen'
         WHERE id = ?
         AND status = 'wartend'`,
        [workerId, taskId]
    );
}


// =========================
// Worker-Überwachung
// =========================

/**
 * Markiert Worker als inaktiv, wenn ihr letzter Heartbeat zu alt ist.
 *
 * @async
 * @function markInactiveWorkers
 * @returns {Promise<void>}
 */
async function markInactiveWorkers() {
    await query(
        `UPDATE worker
         SET status = 'inaktiv'
         WHERE status = 'aktiv'
         AND letzter_heartbeat < DATE_SUB(NOW(), INTERVAL 60 SECOND)`
    );
}


// =========================
// Fehlerbehandlung / Recovery
// =========================

/**
 * Gibt Aufgaben wieder frei, die von inaktiven Workern blockiert wurden.
 *
 * @async
 * @function releaseTasksFromInactiveWorkers
 * @returns {Promise<void>}
 */
async function releaseTasksFromInactiveWorkers() {
    await query(
        `UPDATE aufgabe
         SET worker_id = NULL, status = 'wartend'
         WHERE worker_id IN (
             SELECT id
             FROM worker
             WHERE status = 'inaktiv'
         )
         AND status IN ('zugewiesen', 'in_bearbeitung')`
    );
}


// =========================
// Controller-Logik
// =========================

/**
 * Hauptschleife des Controllers.
 * Überwacht Worker und verteilt Aufgaben.
 *
 * @async
 * @function controllerLoop
 * @returns {Promise<void>}
 */
async function controllerLoop() {
    console.log("Controller-Loop gestartet. Prüfe alle 5 Sekunden auf freie Worker und wartende Aufgaben...");

    while (true) {
        try {
            await markInactiveWorkers();
            await releaseTasksFromInactiveWorkers();

            let task = await getWaitingTask();
            let worker = await getFreeWorker();

            while (task && worker) {
                await assignTaskToWorker(task.id, worker.id);
                console.log(`Aufgabe ${task.id} wurde Worker ${worker.id} zugewiesen`);

                task = await getWaitingTask();
                worker = await getFreeWorker();
            }

        } catch (error) {
            console.error("Fehler im Controller-Loop:", error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}


// =========================
// Startlogik
// =========================

/**
 * Startet den Controller-Prozess.
 * Führt bei Fehlern automatische Wiederholungsversuche durch.
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
            await controllerLoop();

        } catch (error) {
            console.error(`Versuch ${versuch} fehlgeschlagen: ${error.message}`);
            console.log("Warte 5 Sekunden und versuche erneut...");

            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

start();