import { Message, MessageStatus, MessageType, ApiCredentials } from '../types';

const GRAPH_API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const getHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

export const messengerApiService = {
  /**
   * Sends a message via Facebook Messenger API.
   * Docs: https://developers.facebook.com/docs/messenger-platform/reference/send-api/
   */
  sendMessage: async (credentials: ApiCredentials, recipientId: string, text: string): Promise<Message> => {
    if (!credentials.facebookPageId || !credentials.facebookPageAccessToken) {
      throw new Error("Messenger Page ID and Access Token are required.");
    }

    const url = `${BASE_URL}/${credentials.facebookPageId}/messages`;
    
    const body = {
      recipient: { id: recipientId },
      message: { text: text },
      messaging_type: "RESPONSE"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(credentials.facebookPageAccessToken),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to send Messenger message');
    }

    const data = await response.json();
    
    return {
      id: data.message_id || Math.random().toString(36).substr(2, 9),
      text: text,
      sender: 'me',
      timestamp: new Date().toISOString(),
      status: MessageStatus.SENT,
      type: MessageType.TEXT
    };
  },

  /**
   * Send an Image Attachment via Messenger
   */
  sendImageMessage: async (credentials: ApiCredentials, recipientId: string, imageUrl: string): Promise<Message> => {
     if (!credentials.facebookPageId || !credentials.facebookPageAccessToken) {
      throw new Error("Messenger Page ID and Access Token are required.");
    }

    const url = `${BASE_URL}/${credentials.facebookPageId}/messages`;

    const body = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: "image",
          payload: { 
            url: imageUrl, 
            is_reusable: true 
          }
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(credentials.facebookPageAccessToken),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send image');
    }

    const data = await response.json();

    return {
      id: data.message_id || Math.random().toString(36).substr(2, 9),
      text: "Sent an image",
      mediaUrl: imageUrl,
      sender: 'me',
      timestamp: new Date().toISOString(),
      status: MessageStatus.SENT,
      type: MessageType.IMAGE
    };
  }
};