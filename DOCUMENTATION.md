# Documentatie: De Exact Idea Processor

## 1. Functionele Beschrijving
De **Exact Idea Processor** is een real-time innovatieplatform ontworpen om tijdens presentaties of workshops de collectieve intelligentie van een publiek te vangen en direct om te zetten in actieplannen.

### Gebruikersrollen
*   **Deelnemer (Publiek):** Bezoekt de app op mobiel, voert een toegangscode in en stuurt een kort idee of inzicht in.
*   **Admin (Spreker/Innovator):** Beheert de sessie, opent de "Idea Tank", analyseert de resultaten met AI en genereert diepgaande rapportages.

### De Workflow
1.  **Setup:** De admin stelt een "Context" in (bijv. "Hoe vergroten we de klantwaarde?").
2.  **Live Capture:** Publiek scant de QR-code en stuurt ideeën. Deze verschijnen real-time (gesimuleerd) op het scherm van de admin.
3.  **AI Analyse:** Met één klik analyseert de AI alle inzendingen. Het bepaalt de "vibe", een innovatie-score, en selecteert de top 3 ideeën.
4.  **Deep Dive:** Voor de beste ideeën genereert de AI:
    *   **Business Case:** McKinsey-stijl probleem/oplossing analyse.
    *   **Devil's Advocate:** Kritische blik op risico's en "waarom het zou falen".
    *   **Marketing & Pitch:** Slogans en social media posts voor directe promotie.
    *   **Roadmap:** Concrete stappen en Product Backlog Items (PBI's).
5.  **Output:** Export naar PDF (volledig rapport) of CSV (voor Jira/DevOps).

---

## 2. Technische Architectuur
De app is gebouwd als een moderne React Single Page Application (SPA).

### Tech Stack
*   **Frontend:** React 19, Tailwind CSS.
*   **Icons:** Lucide-react.
*   **AI Engine:** Google Gemini SDK (`@google/genai`).
*   **Export:** jsPDF voor PDF generatie.
*   **Bundling:** ES Modules via esm.sh (geen build-stap nodig in deze omgeving).

### Componenten Structuur
*   `App.tsx`: Hoofdcontroller voor de navigatie tussen Landing, Form, Success en Admin.
*   `AdminDashboard.tsx`: De "power-house" van de app met fase-beheer (Menu -> Setup -> Live -> Analysis -> Detail).
*   `ai.ts`: Bevat de logica voor de prompts naar Gemini.

---

## 3. Mock Data & Simulatie

Momenteel werkt de app in een "Prototype Mode". Dit betekent dat er geen actieve database-verbinding is.

### Waar staat de mock data?
1.  **`services/mockData.ts`**: Hier staan de voorgedefinieerde ideeën die tijdens de "Live" fase één voor één binnendruppelen om de ervaring van een live publiek te simuleren.
2.  **`services/ai.ts`**: Indien er geen `API_KEY` aanwezig is in de omgeving, schakelt de app over naar hardcoded AI-responses. Dit zorgt ervoor dat de UI altijd werkt voor demo-doeleinden.

### Hoe wordt de simulatie getriggerd?
In `AdminDashboard.tsx` zit een `useEffect` die in de `LIVE` fase elke 2.5 seconden een item uit `MOCK_IDEAS` toevoegt aan de lokale state:
```typescript
interval = setInterval(() => {
  setIdeas(prev => {
    if (prev.length < MOCK_IDEAS.length) return [...prev, MOCK_IDEAS[prev.length]];
    return prev;
  });
}, 2500);
```

---

## 4. Migratie naar Firebase

Om de app echt live te laten gaan (zodat echte telefoons data naar het grote scherm sturen), moet de lokale state (`ideas`) worden vervangen door een **Cloud Firestore** stream.

### Stap 1: Firebase Project Setup
1.  Ga naar de [Firebase Console](https://console.firebase.google.com/).
2.  Maak een nieuw project aan: "Exact-Idea-Processor".
3.  Activeer **Cloud Firestore** in "Test Mode" (voor prototype).
4.  Activeer **Firebase Authentication** (Email/Password) voor de Admin.

### Stap 2: Firebase SDK Integratie
Voeg de Firebase import toe aan de `index.html` importmap en initialiseer in een nieuwe service `firebase.ts`:
```typescript
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = { /* Jouw Config */ };
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### Stap 3: Mock Data vervangen door Firestore

#### A. Publieke kant (Idee insturen)
Vervang de simulatie in `IdeaForm.tsx` door een echte `addDoc` call:
```typescript
// Oude code: setTimeout(() => onSubmit(), 1500);
// Nieuwe code:
await addDoc(collection(db, "sessions", sessionId, "ideas"), {
  name: name,
  content: idea,
  timestamp: Date.now()
});
```

#### B. Admin kant (Live Feed)
Vervang de `setInterval` in `AdminDashboard.tsx` door een `onSnapshot` listener. Dit zorgt ervoor dat het dashboard *direct* update zodra er ergens ter wereld een idee wordt ingestuurd:
```typescript
useEffect(() => {
  if (phase === 'LIVE') {
    const q = query(collection(db, "sessions", sessionId, "ideas"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIdeas(newIdeas);
    });
    return () => unsubscribe();
  }
}, [phase]);
```

### Stap 4: Deployment met Firebase Studio / Hosting
1.  Installeer Firebase CLI: `npm install -g firebase-tools`.
2.  Run `firebase login` en `firebase init`.
3.  Kies **Hosting** en selecteer je project.
4.  Gebruik `firebase deploy` om de app live te zetten op een `.web.app` of `.firebaseapp.com` domein.

---

## 5. Beveiliging & AI Prompts
De app gebruikt een "System Instruction" laag in `ai.ts` om te voorkomen dat gebruikers de AI kunnen manipuleren (Prompt Injection). Alle invoer wordt gesaneerd en ingesloten in XML-tags voordat het naar Gemini wordt gestuurd. Dit is cruciaal bij het verwerken van onbekende publieksdata.

---
*Gemaakt door de Senior Frontend Engineer voor Exact Idea Processor.*
