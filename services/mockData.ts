import { Idea } from '../types';

// Mock data simulating database entries
export const MOCK_IDEAS: Idea[] = [
  {
    id: '1',
    name: 'Sophie Janssen',
    content: 'We moeten stoppen met papieren handleidingen en overstappen op interactieve AR-tutorials voor onze machines. Dit bespaart kosten en is veel duurzamer.',
    timestamp: Date.now() - 100000,
  },
  {
    id: '2',
    name: 'Mark de Boer',
    content: 'Implementeer een AI-gedreven inkoopmodule die automatisch ' + 
            'bestelt op basis van voorspelde vraag, maar alleen bij leveranciers met een groen energielabel.',
    timestamp: Date.now() - 50000,
  },
  {
    id: '3',
    name: 'Lisa Willems',
    content: 'Een interne marktplaats voor kantoormeubilair en IT-apparatuur. Voordat we iets weggooien of nieuw kopen, kijken we eerst of een andere afdeling het kan gebruiken.',
    timestamp: Date.now() - 20000,
  }
];