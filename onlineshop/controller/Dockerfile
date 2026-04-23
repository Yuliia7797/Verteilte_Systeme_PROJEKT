FROM node:22-alpine

# Erstelle das Arbeitsverzeichnis im Container
WORKDIR /usr/src/app

# Kopiere zuerst package.json und package-lock.json
COPY package*.json ./

# Installiere die Abhängigkeiten sauber und exakt aus package-lock.json
RUN npm ci --omit=dev

# Kopiere danach den restlichen Projektcode
COPY . .

# Dokumentiere den Port der Anwendung
EXPOSE 8080

# Warte kurz, bis die Datenbank gestartet ist, und starte dann den Controller
CMD sleep 30; node controller.js