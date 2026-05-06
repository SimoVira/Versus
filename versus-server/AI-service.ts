import fs from 'fs';
import { VertexAI } from '@google-cloud/vertexai';

//interfaces
export interface GeminiAnalysis {
    score1: number;
    score2: number;
    pros1: string[];
    pros2: string[];
    cons1: string[];
    cons2: string[];
    winner: 1 | 2;
    verdict: string;
}

export interface CompareResponse {
    products: any[];
    geminiAnalysis: GeminiAnalysis;
}

export interface PriceRefreshResponse {
    price: number | null;
    source: string | null;
}

export class AiService {
    private readonly vertexConfig = JSON.parse(
        fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_PATH!, "utf-8")
    );

    private readonly vertexAI = new VertexAI({
        project: this.vertexConfig.project_id,
        location: "europe-west4",
        googleAuthOptions: {
            credentials: this.vertexConfig,
        }
    });

    // ── B. Confronto prodotti con Gemini ──────────────────────
    async compareProducts(p1: any, p2: any): Promise<CompareResponse> {
        const prompt = `
Sei un esperto di tecnologia. Confronta i seguenti due prodotti in modo approfondito.
Usa la tua conoscenza aggiornata e cerca informazioni online su questi prodotti.
 
PRODOTTO 1: ${p1.name} (${p1.brand})
Prezzo: €${p1.price}
Specifiche: ${JSON.stringify(p1.specs, null, 2)}
 
PRODOTTO 2: ${p2.name} (${p2.brand})
Prezzo: €${p2.price}
Specifiche: ${JSON.stringify(p2.specs, null, 2)}
 
Analizza entrambi considerando: prestazioni reali, rapporto qualità/prezzo,
esperienza d'uso, recensioni degli utenti e affidabilità nel tempo.
 
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido. 
IMPORTANTE: Non inserire commenti, non inserire markdown come \`\`\`json, 
assicurati che tutte le virgolette interne siano scappate correttamente.
{
  "score1": <numero 0-100 per ${p1.name}>,
  "score2": <numero 0-100 per ${p2.name}>,
  "pros1": [<3 punti di forza di ${p1.name}>],
  "pros2": [<3 punti di forza di ${p2.name}>],
  "cons1": [<2 punti deboli di ${p1.name}>],
  "cons2": [<2 punti deboli di ${p2.name}>],
  "winner": <1 oppure 2>,
  "verdict": <2-3 frasi in italiano con verdetto finale e consiglio d'acquisto>
}
`.trim();

        // ── C. Chiama Gemini via Vertex AI ────────────────────────
        try {
            const generativeModel = this.vertexAI.getGenerativeModel({
                model: "gemini-2.5-flash",
            });

            /*
            const generativeModel = this.vertexAI.getGenerativeModel({
                model: "gemini-2.0-flash-001",
                tools: [{ googleSearch: {} }]  // ← su gemini-2.0 si chiama googleSearch, non googleSearchRetrieval
            });
            OPPURE:
            const generativeModel = this.vertexAI.getGenerativeModel({
                model: "gemini-1.5-pro-002",
                tools: [{ googleSearchRetrieval: {} }]
            });
            */

            const result = await generativeModel.generateContent(prompt);
            const response = result.response;

            // Estrazione testo dalla risposta Vertex AI
            const raw = response.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log("Risposta da Vertex AI ricevuta: ", raw);

            if (!raw) {
                throw new Error("L'AI ha restituito una risposta vuota");
            }

            // Pulizia e parsing del JSON
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Formato JSON non trovato nella risposta AI");
            }

            const products: any[] = [p1, p2];
            const geminiAnalysis: GeminiAnalysis = JSON.parse(jsonMatch[0]);

            const compareResponse: CompareResponse = {
                products,
                geminiAnalysis
            };

            return compareResponse;
        } catch (error: any) {
            console.error("Errore Vertex AI SDK:", error);
            throw new Error(`Errore durante l'analisi AI: ${error.message}`);
        }
    }




    async refreshProductPrice(searchQuery: string): Promise<PriceRefreshResponse> {

        const prompt = `
Cerca il prezzo attuale di "${searchQuery}" su Google Shopping o siti e-commerce italiani
(Amazon.it, Unieuro, MediaWorld, eBay.it, ecc.).
Rispondi SOLO con un oggetto JSON valido, senza markdown, senza spiegazioni:
{"price": <numero in EUR oppure null>, "source": "<nome del sito oppure null>"}
Se non trovi un prezzo affidabile rispondi:
{"price": null, "source": null}
`.trim();

        try {
            const generativeModel = this.vertexAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                tools: [{ googleSearch: {} } as any]
            });

            const result = await generativeModel.generateContent(prompt);
            const response = result.response;

            const raw = response.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log("Risposta prezzo da Vertex AI ricevuta: ", raw);

            if (!raw) {
                throw new Error("L'AI ha restituito una risposta vuota");
            }

            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Formato JSON non trovato nella risposta AI");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            let price: number | null = null;

            if (typeof parsed.price === "number" && Number.isFinite(parsed.price)) {
                price = parsed.price;
            } else if (typeof parsed.price === "string") {
                const normalized = parsed.price.replace(/[^\d,.]/g, "").replace(",", ".");
                const numericPrice = Number(normalized);
                price = Number.isFinite(numericPrice) ? numericPrice : null;
            }

            const priceRefreshResponse: PriceRefreshResponse = {
                price,
                source: parsed.source ?? null
            };

            return priceRefreshResponse;
        } catch (error: any) {
            console.error("Errore Vertex AI SDK:", error);
            throw new Error(`Errore durante l'aggiornamento prezzo AI: ${error.message}`);
        }
    }
}
