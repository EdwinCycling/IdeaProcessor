
import pkg from '../package.json';

export const TEXTS = {
  APP_NAME: {
    PREFIX: "=",
    MAIN: "Exact",
    SUFFIX: "Idea Processor",
    VERSION: `v ${pkg.version}`,
  },
  NAV: {
    ADMIN_LOGIN: "Admin Login",
    LOGIN: "Inloggen",
    LOGOUT: "Uitloggen",
    SETTINGS: "Instellingen",
  },
  HERO: {
    BADGE: "VIBE CODED // SYSTEM ONLINE",
    TITLE_PREFIX: "Verander je publiek in een",
    TITLE_HIGHLIGHT: "Think Tank",
    DESCRIPTION: "Verzamel ideeën, analyseer de vibe en genereer roadmaps. Live. In seconden. Powered by AI.",
    CTA_PRIMARY: "WAT IS UW IDEE?",
  },
  FEATURES: {
    TITLE: "Power Features",
    SUBTITLE: "De tools die je nodig hebt om interactie om te zetten in innovatie.",
    ITEMS: [
      {
        title: 'Real-time Sync',
        description: 'Nul vertraging. Socket.io technologie zorgt dat ideeën direct van telefoon naar het grote scherm vliegen.',
      },
      {
        title: 'AI Analyse',
        description: 'AI analyseert de "vibe" van de zaal. Krijg in seconden een samenvatting van honderden inzendingen.',
      },
      {
        title: 'Directe Roadmaps',
        description: 'Klik op een idee en genereer direct een projectplan met milestones. Van post-it naar project in één klik.',
      },
      {
        title: 'Veilige Cloud',
        description: 'Gebouwd op Google Firebase. Data is encrypted, veilig en altijd beschikbaar.',
      },
    ]
  },
  HOW_IT_WORKS: {
    WORKFLOW: "WORKFLOW",
    TITLE: "Hoe het werkt",
    STEPS: [
      {
        label: "STAP 01",
        title: "Scan QR",
        desc: "Het publiek scant de QR code op het scherm. Geen app download nodig.",
      },
      {
        label: "STAP 02",
        title: "Stuur Idee",
        desc: "Deelnemers typen hun inzichten. Data verschijnt real-time in het Dashboard.",
      },
      {
        label: "STAP 03",
        title: "AI Magic",
        desc: "De AI herkent patronen, maakt samenvattingen en selecteert de beste ideeën.",
      }
    ]
  },
  MODALS: {
    ACCESS: {
      TITLE: "Toegangscode",
      DESC: "Voer de code in die op het scherm wordt getoond.",
      PLACEHOLDER: "Code...",
      ERROR: "Onjuiste code.",
      CANCEL: "Annuleren",
      SUBMIT: "Doorgaan"
    },
    ADMIN: {
      TITLE: "Admin Login",
      DESC: "Log in met uw Firebase account.",
      EMAIL: "EMAIL",
      PASS: "WACHTWOORD",
      BUTTON_LOADING: "Verifiëren...",
      BUTTON_DEFAULT: "Login"
    },
    SETTINGS: {
      TITLE: "Sessie Instellingen",
      ACCESS_CODE_LABEL: "PUBLIEK TOEGANGSCODE",
      ACCESS_CODE_DESC: "Minimaal 3 karakters. Deelnemers moeten deze code invoeren.",
      CONTEXT_LABEL: "STANDAARD CONTEXT / VRAAG",
      CONTEXT_DESC: "Deze tekst wordt automatisch ingevuld bij nieuwe sessies.",
      CONTEXT_PLACEHOLDER: "Bijv: Hoe kunnen we...",
      BTN_SAVE: "Opslaan & Sluiten"
    },
    PRIVACY: {
      TITLE: "Privacybeleid",
      CONTENT: "Uw privacy is van het grootste belang voor ons. De gegevens die u deelt tijdens sessies worden uitsluitend gebruikt voor de directe functionaliteit van de Exact Idea Processor. Wij delen geen persoonsgegevens met derden."
    },
    TERMS: {
      TITLE: "Algemene Voorwaarden",
      CONTENT: "Door gebruik te maken van de applicatie gaat u akkoord met onze voorwaarden. Alle ingediende ideeën, concepten en data worden volledig en exclusief eigendom van Exact. Exact behoudt zich het onherroepelijke recht voor om deze informatie vrijelijk te gebruiken, te ontwikkelen, te wijzigen, te publiceren of te commercialiseren, op welke wijze dan ook, zonder enige verplichting tot compensatie, erkenning of notificatie aan de indiener. De indiener doet hierbij afstand van alle (intellectuele) eigendomsrechten met betrekking tot de ingediende content."
    },
    COOKIES: {
      TITLE: "Cookiebeleid",
      CONTENT: "Exact Idea Processor gebruikt functionele cookies om uw sessie en voorkeuren te beheren. Er worden geen tracking-cookies van derden gebruikt voor advertentiedoeleinden. De verzamelde gegevens (zoals ingevoerde toegangscodes en sessie-ID's) worden lokaal opgeslagen en versleuteld verzonden naar onze beveiligde servers.",
      BANNER: {
        TEXT: "Wij gebruiken cookies om uw ervaring te verbeteren en de applicatie goed te laten werken.",
        BTN_ACCEPT: "Accepteren en Doorgaan"
      }
    },
    CONTACT: {
      TITLE: "Contact",
      DESC: "Vragen of een demo?",
      NAME: "Edwin",
      ROLE: "AI Innovation Lap CPO",
      EMAIL: "edwin.dingjan@exact.com"
    }
  },
  FORM: {
    TITLE: "Nieuw Idee",
    HEADING: "Deel uw inzicht",
    SUBHEADING: "Uw input wordt direct verwerkt door onze AI.",
    LABEL_NAME: "UW NAAM",
    LABEL_IDEA: "UW IDEE",
    PLACEHOLDER_NAME: "Bijv. Jan de Vries",
    PLACEHOLDER_IDEA: "Beschrijf uw idee in minimaal 5 karakters...",
    BTN_SUBMIT: "Insturen",
    BTN_SENDING: "Versturen...",
    BTN_CANCEL: "Annuleren",
  },
  SUCCESS: {
    TITLE: "Bedankt!",
    DESC: "Uw idee is succesvol ontvangen en wordt meegenomen in de AI analyse.",
    BTN_CLOSE: "Sluiten"
  },
  ADMIN_DASHBOARD: {
    TITLE: "Admin Control",
    LOGOUT: "LOGOUT",
    HUB: {
      BTN_SETTINGS: "Configuratie",
      DESC_SETTINGS: "Beheer toegangscodes en standaard vragen.",
      BTN_START: "Open Idea Tank",
      DESC_START: "Start een nieuwe interactieve sessie.",
    },
    SETUP: {
      TITLE: "Sessie Configuratie",
      LABEL: "CONTEXT / VRAAG AAN PUBLIEK",
      PLACEHOLDER: "Bijv: Hoe kunnen we onze interne processen verduurzamen?",
      BTN_START: "OPEN IDEA TANK",
    },
    LIVE: {
      STATUS_ACTIVE: "SESSIE ACTIEF",
      SCAN_TITLE: "Scan om deel te nemen",
      CODE_LABEL: "Code: ",
      PARTICIPANTS: "DEELNEMERS",
      IDEAS: "IDEEËN",
      LOG_TITLE: "Live Activity Log",
      BTN_STOP: "EINDE IDEA TANK",
    },
    ANALYSIS: {
      STATUS_DONE: "ANALYSE GEREED",
      TITLE: "AI Resultaten",
      LOADING: "AI is de resultaten aan het verwerken...",
      SUMMARY_TITLE: "Samenvatting",
      TOP_3_TITLE: "Top 3 Ideeën",
      BTN_NEXT: "Selecteer & Volgende Stap",
      MOCK_NOTICE: "MOCK DATA MODE",
    },
    DETAIL: {
      LOADING: "Idee uitwerken...",
      TABS: {
        GENERAL: "Rationale",
        QUESTIONS: "Vervolgvragen",
        AI_ANSWERS: "AI Simulatie",
        BUSINESS_CASE: "Business Case",
        DEVILS_ADVOCATE: "Devil's Advocate",
        MARKETING: "Marketing & Pitch"
      },
      RATIONALE_TITLE: "Rationale & Onderbouwing",
      PLAN_TITLE: "Implementatie Plan",
      QUESTIONS_TITLE: "Kritische Vragen",
      BTN_PDF: "Download PDF",
      BTN_PBI: "Genereer PBI's",
      BTN_BACK: "Kies ander idee",
      BTN_RESET: "Nieuwe Sessie Starten",
      MODAL_PBI_TITLE: "Product Backlog Items",
      PBI_POINTS: "Story Points"
    }
  },
  FOOTER: {
    COPYRIGHT: "© 2026 Edwin - AI Innovation Lap CPO",
    LINKS: {
      PRIVACY: "Privacy",
      TERMS: "Voorwaarden",
      COOKIES: "Cookies",
      CONTACT: "Contact"
    }
  },
  USP: {
    POWERED: "POWERED BY",
    AI: "Advanced AI",
    REALTIME: "REALTIME VIA",
    SOCKET: "Socket.io",
    SECURED: "SECURED BY",
    FIREBASE: "Google Firebase"
  },
  CTA_BOTTOM: {
    TITLE: "Klaar om de vibe te vangen?",
    DESC: "Geen saaie presentaties meer. Maak van je publiek actieve deelnemers.",
    BTN: "VOER UW IDEE IN..."
  }
};
