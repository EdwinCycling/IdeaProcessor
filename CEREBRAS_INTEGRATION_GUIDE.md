# Cerebras API Integratie Documentatie

Dit document beschrijft de technische implementatie van de Cerebras API binnen de Exact Idea Processor. Het dient als handleiding voor ontwikkelaars die de integratie willen begrijpen of vergelijkbare applicaties willen overzetten van Google Gemini naar Cerebras.

## 1. Overzicht
De Exact Idea Processor is overgestapt van Google Gemini naar **Cerebras Cloud** om gebruik te maken van de extreem hoge inferentie-snelheden van het Llama-3.3-70b model. De integratie is ondergebracht in een Node.js Express backend die fungeert als een proxy tussen de frontend en de Cerebras SDK.

## 2. Architectuur
- **Frontend**: React (Vite) applicatie die via `fetch` communiceert met de backend API.
- **Backend**: Express.js server (`server/app.js`) die de `@cerebras/cerebras_cloud_sdk` gebruikt.
- **Model**: `llama-3.3-70b` (gekozen vanwege de balans tussen snelheid en intelligentie).

## 3. API Endpoints & Functionaliteit

### 3.1 `/api/analyze`
Analyseert een batch met ideeën binnen een specifieke context.
- **Input**: `context` (string), `ideas` (Array van Idea objecten).
- **Output**: JSON met samenvatting, top ideeën, een headline, innovatiescore en keywords.
- **Techniek**: Gebruikt XML-achtige tags (`<context>`, `<ideas>`) om data strikt te scheiden van instructies.

### 3.2 `/api/generate-details`
Genereert een diepgaande uitwerking van één specifiek idee.
- **Output**: Bevat rationale, vragen voor de auteur, implementatiestappen, PBIs (Jira-stijl), Business Case (McKinsey-stijl), Devil's Advocate analyse en marketing uitingen.
- **Instelling**: `max_tokens: 8192` om volledige uitwerkingen te garanderen zonder afbreking.

### 3.3 `/api/chat`
Interactieve chatbot met drie verschillende rollen:
1. **Product Manager**: Focus op haalbaarheid en roadmap.
2. **Investor**: Focus op ROI en risico's.
3. **Sales**: Focus op commerciële kansen.
- **Techniek**: Dynamische `system_instruction` op basis van de gekozen rol.

### 3.4 `/api/cluster-ideas`
Groepeert vergelijkbare ideeën tot "Clusters" om dubbel werk te voorkomen en synergie te vinden.

## 4. Prompt Engineering & Best Practices

### 4.1 Data Sanitization
Om prompt injection te voorkomen en de stabiliteit van de JSON-output te verhogen, passen we `sanitizeInput` toe op alle gebruikersinput:
- Ontsnappen van backslashes en quotes.
- Verwijderen van controlekarakters (`[\x00-\x1F\x7F-\x9F]`).

### 4.2 JSON Stabiliteit & Robustheid
Cerebras is zeer snel, maar LLM's kunnen soms Markdown code-blocks of inleidende tekst toevoegen. Onze implementatie hanteert een "extractie" strategie:

1. **Helper Functie**: We gebruiken een `extractJSON` helper die zoekt naar de eerste `{` en laatste `}` in de tekst als een directe `JSON.parse()` faalt.
2. **Opschonen**: Verwijderen van ```json ... ``` tags.
3. **Configuratie**: Lage `temperature` (0.2) voor analytische taken.

```javascript
const extractJSON = (text) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
    }
};
```

### 4.3 Gestructureerde Prompts
We maken intensief gebruik van XML-tags in de prompts. Dit helpt het model om de grenzen tussen instructies, context en gebruikersdata (ideeën) beter te begrijpen.

## 5. Overstappen van Gemini naar Cerebras

Voor applicaties die momenteel Gemini gebruiken, zijn dit de stappen om over te schakelen:

### 5.1 SDK Vervanging
Vervang `@google/genai` door `@cerebras/cerebras_cloud_sdk`.

```javascript
// OUDE GEMINI (Firebase/Google)
const { GoogleGenAI } = require("@google/genai");
const genAI = new GoogleGenAI({ apiKey });

// NIEUWE CEREBRAS
import Cerebras from '@cerebras/cerebras_cloud_sdk';
const client = new Cerebras({ apiKey });
```

### 5.2 Response Formaat
Gemini gebruikt vaak `response.text()`, terwijl Cerebras de OpenAI-compatibele structuur volgt:

```javascript
// Gemini
const response = await model.generateContent(prompt);
const text = response.text();

// Cerebras
const completion = await client.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b"
});
const text = completion.choices[0].message.content;
```

### 5.3 Systeem Instructies
Bij Gemini geef je systeeminstructies vaak mee in de configuratie. Bij Cerebras (Chat Completions) voeg je een bericht toe met `role: "system"` aan het begin van de berichten-array.

## 6. Configuratie & Fallback (Nieuw)

De applicatie ondersteunt nu flexibele configuratie van het AI-model via `.env` variabelen, inclusief een automatisch fallback mechanisme.

### 6.1 Variabelen in `.env`

- `CEREBRAS_MODEL`: Het primaire model (bijv. `llama-3.3-70b`).
- `CEREBRAS_MODEL_FALLBACK`: (Optioneel) Het reservemodel dat geprobeerd wordt als het primaire model faalt (bijv. `llama-3.1-70b`).

### 6.2 Fallback Logica

In `server/app.js` is de helper functie `callAI` geïmplementeerd. Deze functie:
1. Probeert eerst het verzoek uit te voeren met `CEREBRAS_MODEL`.
2. Vangt eventuele fouten af.
3. Indien een `CEREBRAS_MODEL_FALLBACK` is ingesteld, probeert hij het verzoek opnieuw met dit model.
4. Als ook dit faalt (of niet is ingesteld), wordt de fout doorgegeven aan de error handler.

Dit verhoogt de betrouwbaarheid van de applicatie aanzienlijk bij eventuele storingen of limieten op specifieke modellen.
