import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { SystemError, Member } from "../types";

export const analyzeSystemError = async (error: SystemError): Promise<string> => {
  const analyzeErrorFn = httpsCallable(functions, 'analyzeSystemError');
  
  try {
    const result = await analyzeErrorFn({ error });
    return result.data as string;
  } catch (err) {
    console.error("Gemini Service Error:", err);
    return "Failed to contact AI service for analysis.";
  }
};

export const summarizeMemberFinancials = async (member: Member, transactions: any[]): Promise<string> => {
  const summarizeFn = httpsCallable(functions, 'summarizeMemberFinancials');

  try {
    const result = await summarizeFn({ member, transactions });
    return result.data as string;
  } catch (err) {
    console.error("Gemini Service Error:", err);
    return "Failed to generate summary.";
  }
}

export const summarizeFile = async (filePath: string, fileType: string): Promise<string> => {
  const summarizeFileFn = httpsCallable(functions, 'summarizeFile');

  try {
    const result = await summarizeFileFn({ filePath, fileType });
    return result.data as string;
  } catch (err) {
    console.error("Gemini Service Error:", err);
    return "Failed to generate summary.";
  }
}
