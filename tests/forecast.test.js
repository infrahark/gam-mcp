import { jest } from '@jest/globals';

const mockAxiosInstance = jest.fn();
jest.unstable_mockModule('axios', () => ({
  default: mockAxiosInstance,
}));

const mockAuth = { getAccessToken: jest.fn().mockResolvedValue('fake-token') };

const { getForecast } = await import('../src/forecast.js');

describe('getForecast', () => {
  beforeEach(() => mockAxiosInstance.mockReset());

  it('fetches line item forecast when line_item_id provided', async () => {
    mockAxiosInstance.mockResolvedValueOnce({
      data: { matched: 100000, available: 85000, possible: 120000 },
    });

    const result = await getForecast('12345',
      { line_item_id: '999', start_date: '2026-11-01', end_date: '2026-11-30' },
      mockAuth
    );

    expect(result).toMatchObject({ matched: 100000, available: 85000, possible: 120000 });
    expect(result.lineItemId).toBe('999');
  });

  it('fetches ad unit forecast when ad_unit_id provided', async () => {
    mockAxiosInstance.mockResolvedValueOnce({
      data: { matched: 50000, available: 40000, possible: 60000 },
    });

    const result = await getForecast('12345',
      { ad_unit_id: '456', start_date: '2026-11-01', end_date: '2026-11-30' },
      mockAuth
    );

    expect(result).toMatchObject({ matched: 50000, available: 40000 });
    expect(result.adUnitId).toBe('456');
  });

  it('throws when neither line_item_id nor ad_unit_id provided', async () => {
    await expect(
      getForecast('12345', { start_date: '2026-11-01', end_date: '2026-11-30' }, mockAuth)
    ).rejects.toThrow('line_item_id or ad_unit_id');
  });
});
