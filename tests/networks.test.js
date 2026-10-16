import { jest } from '@jest/globals';

const mockAxiosInstance = jest.fn();
jest.unstable_mockModule('axios', () => ({ default: mockAxiosInstance }));

const mockAuth = { getAccessToken: jest.fn().mockResolvedValue({ token: 'fake-token' }) };

const { fetchNetworks } = await import('../src/networks.js');

describe('fetchNetworks', () => {
  beforeEach(() => mockAxiosInstance.mockReset());

  it('returns networks array from GAM API', async () => {
    mockAxiosInstance.mockResolvedValueOnce({
      data: { networks: [{ networkCode: '12345', displayName: 'My Network' }] },
    });
    const networks = await fetchNetworks(mockAuth);
    expect(networks).toHaveLength(1);
    expect(networks[0].networkCode).toBe('12345');
  });

  it('returns empty array when API returns no networks key', async () => {
    mockAxiosInstance.mockResolvedValueOnce({ data: {} });
    const networks = await fetchNetworks(mockAuth);
    expect(networks).toEqual([]);
  });

  it('calls the correct GAM networks endpoint with auth', async () => {
    mockAxiosInstance.mockResolvedValueOnce({ data: { networks: [] } });
    await fetchNetworks(mockAuth);
    const call = mockAxiosInstance.mock.calls[0][0];
    expect(call.url).toMatch(/\/networks$/);
    expect(call.headers.Authorization).toBe('Bearer fake-token');
  });
});
