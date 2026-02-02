# Security Audit Rapport (V2)

**Datum:** 24 Februari 2025
**Status:** ✅ Veilig voor Productie (Mits onderstaande instructies worden gevolgd)

## 1. Samenvatting
Na de laatste updates is de applicatie-architectuur fundamenteel veiliger gemaakt door de scheiding van Frontend (Netlify) en Backend (Firebase Functions).

## 2. Kritieke Controles

### ✅ API Keys (Gemini AI)
*   **Frontend Code:** De key `VITE_GEMINI_API_KEY` is **verwijderd** uit alle frontend bestanden. De browser heeft geen toegang meer tot de sleutel.
*   **Frontend Config:** In `.env` staat de key nu als `GEMINI_API_KEY` (zonder `VITE_` prefix). Dit is veilig omdat Vite/Netlify deze variabelen negeert tijdens het bouwen van de website.
*   **Backend:** De key wordt veilig uitgelezen via `process.env.GEMINI_API_KEY` in de afgeschermde Google Cloud omgeving.

### ✅ Database Toegang
*   **Regels:** Er is een strikt `firestore.rules` bestand.
*   **Publiek:** Kan alleen *schrijven* (nieuwe ideeën insturen) en *niet* lezen (andere ideeën zien).
*   **Admin:** Kan alles lezen en beheren, maar alleen na inloggen.

### ✅ Authenticatie
*   **Systeem:** Gebruikt Firebase Authentication (Email/Wachtwoord).
*   **Lekken:** Geen hardcoded wachtwoorden of mock-logins meer aanwezig.

## 3. Aandachtspunten voor Deployment

### ⚠️ Let op: Netlify Secrets vs. Firebase Secrets
Er is vaak verwarring over waar de sleutel moet staan.

1.  **Frontend (Netlify):**
    *   Heeft de AI-sleutel **NIET** nodig.
    *   Zet hem **NIET** in Netlify Environment Variables als `VITE_GEMINI_API_KEY`.
    *   Netlify host alleen de "voorkant".

2.  **Backend (Firebase):**
    *   Heeft de AI-sleutel **WEL** nodig.
    *   Je moet hem instellen via de terminal: `firebase functions:secrets:set GEMINI_API_KEY`.
    *   Als je dit vergeet, werkt de AI niet (je krijgt dan "Mock" antwoorden).

## 4. Conclusie
De applicatie is nu "Secure by Design". Zolang de sleutel niet per ongeluk in de `VITE_` variabelen wordt gezet in Netlify, is het systeem veilig.
