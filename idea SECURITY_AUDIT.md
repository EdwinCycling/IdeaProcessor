# Security Audit Rapport: De Exact Idea Processor

**Datum:** 24 Februari 2025
**Type:** Static Application Security Testing (SAST) - Code Review
**Status:** Prototype / Pre-Productie

---

## 1. Samenvatting
De applicatie bevindt zich in een prototype-fase. We hebben inmiddels mitigaties toegepast voor input validatie en prompt injection. Het grootste risico blijft de Client-Side API Key.

**Belangrijkste Risico:** De Google Gemini API Key wordt blootgesteld aan de browser.

---

## 2. Kritieke Kwetsbaarheden (High Severity)

### 2.1 Exposed API Key (Hardcoded Secrets)
*   **Locatie:** `services/ai.ts` en `.env` gebruik in React.
*   **Probleem:** In een Vite/React applicatie worden variabelen die beginnen met `VITE_` of direct worden aangeroepen via `process.env` *ingebakken* in de Javascript bundel.
*   **Risico:** Iedereen kan de API key uitlezen.
*   **Oplossing (Productie):** Gebruik een backend (Firebase Functions) als proxy.
*   **Huidige Mitigatie:** Stel HTTP Referrer Restrictions in via Google Cloud Console.

### 2.2 Broken Authentication (Mock Login)
*   **Locatie:** `components/AdminLoginModal.tsx`
*   **Status:** **Aanwezig (Prototype Mode)**.
*   **Probleem:** De login accepteert momenteel *elke* invoer voor demonstratiedoeleinden.
*   **Oplossing:** Implementeer Firebase Authentication voor productie.

---

## 3. Opgeloste / Gemitigeerde Kwetsbaarheden

### 3.1 AI Prompt Injection (Gemitigeerd)
*   **Oplossing:** In `services/ai.ts` wordt gebruikersinput nu ingesloten in XML-tags (`<user_data>`). De systeeminstructie is aangepast om data binnen deze tags expliciet *niet* als instructies te behandelen.

### 3.2 Input Sanitization (Gemitigeerd)
*   **Oplossing:**
    *   `IdeaForm.tsx`: Maximale lengtes toegevoegd aan invoervelden.
    *   `services/ai.ts`: `sanitizeInput` functie filtert control characters en escaped quotes voordat data naar de AI gaat.

---

## 4. Privacy & GDPR (AVG)

*   **Data Opslag:** Op dit moment worden namen (`IdeaForm.tsx`) tijdelijk in het geheugen van de browser opgeslagen.
*   **Vereiste:** Zorg voor een verwerkersovereenkomst als je Google Gemini (Enterprise) gebruikt.

---

## 5. Aanbevolen Actieplan

1.  **Stap 1:** Beperk de API Key via Google Console tot jouw domein.
2.  **Stap 2:** Vervang de mock login door echte Firebase Auth.
3.  **Stap 3:** Migreer AI calls naar een server-side omgeving.