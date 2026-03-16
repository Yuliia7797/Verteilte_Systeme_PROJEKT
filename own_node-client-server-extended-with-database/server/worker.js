'use strict';

const mysql = require('mysql');

// Database connection info - same as in server.js
const dbInfo = {
    connectionLimit: 10,
    host: process.env.MYSQL_HOSTNAME,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

const connection = mysql.createPool(dbInfo);

console.log("Worker startet und verbindet sich mit der Datenbank...");

// eine offene Aufgabe holen
async function getNextTask(){
    const results = await query ("SELECT * FROM aufgabe WHERE status = 'PENDING' ORDER BY id ASC");

    if (results.length === 0) {
        return null;
    }

    return results [0];
}

//eine Aufgabe auf 'RUNNING' setzen
async function markAsRunning(taskId){
    await query("UPDATE aufgabe SET status = 'RUNNING' WHERE id=?", [taskId]);

}

//eine Aufgabe auf 'DONE' setzen
async function markAsDone(taskId){
    await query("UPDATE aufgabe SET status = 'DONE' WHERE id=?", [taskId]);
    
}