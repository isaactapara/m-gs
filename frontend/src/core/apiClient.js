// API Client configuration
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 1000,
});

export default apiClient;