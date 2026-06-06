import axios from 'axios';

const evolutionApi = axios.create({
  baseURL: import.meta.env.VITE_EVOLUTION_API_URL || 'http://localhost:8080',
  headers: {
    'apikey': import.meta.env.VITE_EVOLUTION_API_KEY || 'replace_with_your_key',
    'Content-Type': 'application/json'
  }
});

export const evolutionService = {
  getInstances: async () => {
    const response = await evolutionApi.get('/instance/fetchInstances');
    return response.data;
  },
  createInstance: async (data: { instanceName: string; token: string }) => {
    const response = await evolutionApi.post('/instance/create', data);
    return response.data;
  },
  connectInstance: async (instanceName: string) => {
    const response = await evolutionApi.get(`/instance/connect/${instanceName}`);
    return response.data;
  },
  getChats: async (instanceName: string) => {
    const response = await evolutionApi.get(`/chat/findChats/${instanceName}`);
    return response.data;
  },
  getMessages: async (instanceName: string, remoteJid: string) => {
    const response = await evolutionApi.get(`/chat/findMessages/${instanceName}?remoteJid=${remoteJid}`);
    return response.data;
  }
};
