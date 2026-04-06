## Schnellstart

1. Repository klonen.
2. In einen Beispielordner wechseln.
3. Dort (falls vorhanden) die lokale Anleitung in der jeweiligen `README.md` lesen.
4. In der Regel starten die Projekte mit:


docker-compose up --build


## Node.js

- **Client-Server plain TCP**
  - Anleitung: [node-plain-tcp/README.md](node-plain-tcp/README.md)
  - Ordner: [node-plain-tcp](node-plain-tcp/)
- **Client-Server Webserver**
  - Anleitung: [node-client-server/README.md](node-client-server/README.md)
  - Ordner: [node-client-server](node-client-server/)
- **Message Oriented MQTT**
  - Anleitung: [node-mqtt/README.md](node-mqtt/README.md)
  - Ordner: [node-mqtt](node-mqtt/)
- **Peer2Peer**
  - Anleitung: [node-p2p/README.md](node-p2p/README.md)
  - Ordner: [node-p2p](node-p2p/)
- **Client-Server Webserver - Extended**
  - Anleitung: [node-client-server-extended/README.md](node-client-server-extended/README.md)
  - Ordner: [node-client-server-extended](node-client-server-extended/)
- **Client-Server Webserver - Extended mit Datenbank**
  - Anleitung: [node-client-server-extended-with-database/README.md](node-client-server-extended-with-database/README.md)
  - Ordner: [node-client-server-extended-with-database](node-client-server-extended-with-database/)
- **Client-Server Webserver - Extended mit Datenbank und Nodemon**
  - Anleitung: [node-client-server-extended-with-database-nodemon/README.md](node-client-server-extended-with-database-nodemon/README.md)
  - Ordner: [node-client-server-extended-with-database-nodemon](node-client-server-extended-with-database-nodemon/)

## Hinweise zur Projektarbeit

- Du darfst andere Sprachen oder Frameworks verwenden, wenn sie mit der Lehrveranstaltung abgestimmt sind.
- Nutze die Beispiele als **Startpunkt**, nicht als starre Vorgabe.
- Achte auf saubere Struktur, nachvollziehbare README-Dokumentation und reproduzierbare Builds.

## Troubleshooting (kurz)

- Port belegt: Ports in `docker-compose.yaml` anpassen.
- Container startet nicht: Logs prüfen mit `docker-compose logs -f`.
- Altes DB-Schema wird weiterverwendet: Container/Volumes sauber neu starten (`docker-compose down`).

