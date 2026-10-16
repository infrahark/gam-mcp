import axios from 'axios';
import { getAccessToken } from './auth.js';

const GAM_BASE = 'https://admanager.googleapis.com/v1';

export async function fetchNetworks(authClient) {
  const token = await getAccessToken(authClient);
  const response = await axios({
    method: 'GET',
    url: `${GAM_BASE}/networks`,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.networks || [];
}
