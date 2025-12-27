import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";

// NOTE: In a production app, never expose keys on the client.
// This is for demonstration using the env variable pattern requested.
const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const geminiService = {
  /**
   * Generates smart reply suggestions based on chat history.
   */
  generateSmartReplies: async (messages: Message[]): Promise<string[]> => {
    if (!apiKey) {
      console.warn("Gemini API Key missing");
      return ["Please configure API Key", "Check Settings", "Contact Admin"];
    }

    try {
      // Format conversation for the model
      const conversationText = messages.slice(-10).map(m => 
        `${m.sender === 'me' ? 'Agent' : 'Customer'}: ${m.text}`
      ).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a helpful customer support assistant. Based on the following conversation history, suggest 3 short, professional, and helpful replies the Agent could send next.
        
        Conversation:
        ${conversationText}
        
        Output format: JSON array of strings. Example: ["Yes, we can do that.", "Please wait a moment.", "Here are the details."]`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      return JSON.parse(text);

    } catch (error) {
      console.error("Gemini Smart Reply Error:", error);
      return ["Error generating replies"];
    }
  },

  /**
   * Summarizes a conversation for the agent.
   */
  summarizeChat: async (messages: Message[]): Promise<string> => {
     if (!apiKey) return "API Key missing. Cannot generate summary.";

     try {
       const conversationText = messages.map(m => 
        `${m.sender === 'me' ? 'Agent' : 'Customer'}: ${m.text}`
      ).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the following customer support conversation in 2-3 bullet points, highlighting the customer's intent and current status.
        
        Conversation:
        ${conversationText}`
      });

      return response.text || "No summary available.";
     } catch (error) {
       console.error("Gemini Summary Error", error);
       return "Failed to generate summary.";
     }
  }
};