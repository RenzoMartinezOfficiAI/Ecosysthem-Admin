import { GoogleGenerativeAI } from "@google/generative-ai";
import { SystemError, Member } from "../types";

// NOTE: In a real app, this key should be secure and likely proxies through a backend.
// For this demo, we assume import.meta.env.VITE_API_KEY is available.
const apiKey = import.meta.env.VITE_API_KEY || 'fake_key_for_demo'; 
const genAI = new GoogleGenerativeAI(apiKey);

export const analyzeSystemError = async (error: SystemError): Promise<string> => {
  if (!import.meta.env.VITE_API_KEY) {
    return "Gemini API Key is missing. Please configure the environment.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a technical support agent for a housing management system called EcosysTHEM.
      Analyze the following system error and provide a human-readable explanation and 3 steps for remediation.
      
      Error Type: ${error.type}
      Message: ${error.message}
      Context: ${JSON.stringify(error.context)}
      Timestamp: ${error.createdAt}

      Keep the tone professional and operational.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "No analysis available.";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Failed to contact AI service for analysis.";
  }
};

export const summarizeMemberFinancials = async (member: Member, transactions: any[]): Promise<string> => {
   if (!import.meta.env.VITE_API_KEY) {
    return "Gemini API Key is missing.";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "No summary available.";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Failed to generate summary.";
  }
}
