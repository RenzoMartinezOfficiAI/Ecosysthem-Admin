import { GoogleGenAI } from "@google/genai";
import { SystemError, Member } from "../types";

// NOTE: In a real app, this key should be secure and likely proxies through a backend.
// For this demo, we assume process.env.API_KEY is available.
const apiKey = process.env.API_KEY || 'fake_key_for_demo'; 
const ai = new GoogleGenAI({ apiKey });

export const analyzeSystemError = async (error: SystemError): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Gemini API Key is missing. Please configure the environment.";
  }

  try {
    const prompt = `
      You are a technical support agent for a housing management system called EcosysTHEM.
      Analyze the following system error and provide a human-readable explanation and 3 steps for remediation.
      
      Error Type: ${error.type}
      Message: ${error.message}
      Context: ${JSON.stringify(error.context)}
      Timestamp: ${error.createdAt}

      Keep the tone professional and operational.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No analysis available.";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Failed to contact AI service for analysis.";
  }
};

export const summarizeMemberFinancials = async (member: Member, transactions: any[]): Promise<string> => {
   if (!process.env.API_KEY) {
    return "Gemini API Key is missing.";
  }

  try {
    const txSummary = transactions
      .filter(t => t.memberId === member.id)
      .map(t => `${t.createdAt}: ${'bedRateAtTime' in t ? 'CHARGE' : 'PAYMENT'} amount=${'amount' in t ? t.amount : t.bedRateAtTime}`)
      .join('\n');

    const prompt = `
      You are a financial operations assistant.
      Summarize the financial standing of this member.
      
      Member: ${member.fullName} (${member.status})
      Pay Type: ${member.payType}
      Balance: $${member.accountBalance}
      Outstanding: ${member.hasOutstandingBalance}
      
      Recent Transactions:
      ${txSummary}

      Provide a brief status report (max 100 words) and highlight any immediate actions needed (e.g. collection).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No summary available.";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Failed to generate summary.";
  }
}

export const summarizeFile = async (file: File): Promise<string> => {
    if (!process.env.API_KEY) {
        return "Gemini API Key missing.";
    }

    try {
        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix (e.g., "data:image/png;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });

        const prompt = `
            Analyze this file. Provide a concise summary of its contents (max 50 words) 
            and 3 key keywords or tags that describe it.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: file.type, data: base64Data } },
                    { text: prompt }
                ]
            }
        });

        return response.text || "No summary generated.";
    } catch (error) {
        console.error("Gemini File Summary Error:", error);
        return "Could not generate AI summary for this file type.";
    }
};