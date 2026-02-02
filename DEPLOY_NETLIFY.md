# Deployment Instructies (Netlify & Firebase)

Deze applicatie bestaat uit twee delen:
1.  **Backend (Firebase Functions):** Hier draait de slimme AI logica.
2.  **Frontend (Netlify):** Dit is de website die gebruikers zien.

---

## Deel 1: Backend (Eénmalig instellen)
De backend moet bij Google (Firebase) blijven draaien voor de beveiliging.

1.  **Installeer & Login (Terminal):**
    ```bash
    npm install -g firebase-tools
    firebase login
    ```

2.  **Upload Backend Code:**
    ```bash
    firebase deploy --only functions
    ```

3.  **Upload Database Regels:**
    ```bash
    firebase deploy --only firestore:rules
    ```

4.  **API Key Instellen (Belangrijk!):**
    Zorg dat de API key veilig in Google Cloud staat:
    ```bash
    firebase functions:secrets:set GEMINI_API_KEY
    ```

---

## Deel 2: Frontend (Netlify via GitHub)

We gaan de website hosten op Netlify, gekoppeld aan GitHub. Dit is gratis, snel en veilig.

### Stap A: Voorbereiding (Code naar GitHub)
1.  Maak een nieuwe **Private Repository** aan op GitHub (bijv. `exact-idea-processor`).
2.  Push je code naar GitHub:
    ```bash
    git init
    git add .
    git commit -m "Klaar voor Netlify deploy"
    git branch -M main
    git remote add origin https://github.com/JOUW_NAAM/exact-idea-processor.git
    git push -u origin main
    ```

### Stap B: Netlify Instellen
1.  Log in op [Netlify](https://app.netlify.com/).
2.  Klik op **"Add new site"** -> **"Import from existing project"**.
3.  Kies **GitHub** en selecteer je repository (`exact-idea-processor`).

### Stap C: Configuratie
Netlify herkent automatisch de instellingen uit het `netlify.toml` bestand dat ik heb gemaakt.
Je hoeft alleen nog de "Environment Variables" toe te voegen (deze zijn veilig en niet zichtbaar voor bezoekers).

Ga in Netlify naar **Site configuration > Environment variables** en voeg deze toe (kopieer de waarden uit je lokale `.env` bestand):

| Key | Waarde (Voorbeeld) |
| :--- | :--- |
| `VITE_FIREBASE_API_KEY` | `JOUW_API_KEY` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `jouw-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `jouw-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `jouw-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `VITE_FIREBASE_APP_ID` | `1:123456789:web:abcdef` |

*(Let op: De `GEMINI_API_KEY` hoeft hier NIET bij! Die staat veilig in de backend.)*

4.  Klik op **Deploy site**.

### Klaar! 🚀
Elke keer als je nu code naar GitHub stuurt, zal Netlify je website automatisch updaten binnen 1 minuut.
