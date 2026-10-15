import { jest } from '@jest/globals';

const mockAxiosInstance = jest.fn();
jest.unstable_mockModule('axios', () => ({
  default: mockAxiosInstance,
}));

const mockAuth = { getAccessToken: jest.fn().mockResolvedValue('fake-token') };

const { getLineItemDelivery, getOrderRevenue, getAdUnitPerformance, _forTests } = await import('../src/reports.js');
_forTests.setSleep(() => Promise.resolve());

const NETWORK = '12345';

function mockReportFlow(csvData) {
  mockAxiosInstance
    .mockResolvedValueOnce({ data: { name: 'networks/12345/reports/99' } })
    .mockResolvedValueOnce({ data: {} })
    .mockResolvedValueOnce({
      data: {
        reportOperation: {
          reportStatus: 'DONE',
          reportDataUri: 'https://storage.googleapis.com/fake/report.csv',
        },
      },
    })
    .mockResolvedValueOnce({ data: csvData });
}

describe('getLineItemDelivery', () => {
  beforeEach(() => mockAxiosInstance.mockReset());

  it('returns parsed rows for a date range', async () => {
    mockReportFlow(
      'LINE_ITEM_NAME,LINE_ITEM_ID,ORDER_NAME,LINE_ITEM_STATUS,TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS,TOTAL_LINE_ITEM_LEVEL_CLICKS,TOTAL_LINE_ITEM_LEVEL_CTR,LINE_ITEM_DELIVERY_INDICATOR\n' +
      'Test Ad,111,My Order,DELIVERING,10000,150,0.015,92.3\n'
    );

    const result = await getLineItemDelivery(NETWORK,
      { start_date: '2026-10-01', end_date: '2026-10-14' },
      mockAuth
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      lineItemName: 'Test Ad',
      impressions: 10000,
      clicks: 150,
    });
  });

  it('polls until DONE', async () => {
    mockAxiosInstance
      .mockResolvedValueOnce({ data: { name: 'networks/12345/reports/99' } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { reportOperation: { reportStatus: 'RUNNING' } } })
      .mockResolvedValueOnce({ data: { reportOperation: { reportStatus: 'DONE', reportDataUri: 'https://x' } } })
      .mockResolvedValueOnce({ data: 'LINE_ITEM_NAME,LINE_ITEM_ID,ORDER_NAME,LINE_ITEM_STATUS,TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS,TOTAL_LINE_ITEM_LEVEL_CLICKS,TOTAL_LINE_ITEM_LEVEL_CTR,LINE_ITEM_DELIVERY_INDICATOR\n' });

    await getLineItemDelivery(NETWORK, { start_date: '2026-10-01', end_date: '2026-10-14' }, mockAuth);
    expect(mockAxiosInstance).toHaveBeenCalledTimes(5);
  });

  it('throws on FAILED status with report name', async () => {
    mockAxiosInstance
      .mockResolvedValueOnce({ data: { name: 'networks/12345/reports/99' } })
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: { reportOperation: { reportStatus: 'FAILED' } } });

    await expect(
      getLineItemDelivery(NETWORK, { start_date: '2026-10-01', end_date: '2026-10-14' }, mockAuth)
    ).rejects.toThrow('networks/12345/reports/99');
  });
});

describe('getOrderRevenue', () => {
  beforeEach(() => mockAxiosInstance.mockReset());

  it('returns parsed order rows', async () => {
    mockReportFlow(
      'ADVERTISER_NAME,ORDER_NAME,ORDER_ID,TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS,TOTAL_LINE_ITEM_LEVEL_ALL_REVENUE,LINE_ITEM_AVERAGE_COST_PER_UNIT\n' +
      'Acme Corp,Q4 Campaign,555,50000,1200.50,24.01\n'
    );
    const result = await getOrderRevenue(NETWORK, { start_date: '2026-10-01', end_date: '2026-10-14' }, mockAuth);
    expect(result[0]).toMatchObject({ advertiserName: 'Acme Corp', revenue: 1200.50 });
  });
});

describe('getAdUnitPerformance', () => {
  beforeEach(() => mockAxiosInstance.mockReset());

  it('returns parsed ad unit rows', async () => {
    mockReportFlow(
      'AD_UNIT_NAME,AD_UNIT_ID,TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS,TOTAL_LINE_ITEM_LEVEL_FILL_RATE,TOTAL_LINE_ITEM_LEVEL_ALL_REVENUE,AD_UNIT_REVENUE_PER_THOUSAND_IMPRESSIONS\n' +
      'Homepage Leaderboard,789,80000,0.92,950.00,11.875\n'
    );
    const result = await getAdUnitPerformance(NETWORK, { start_date: '2026-10-01', end_date: '2026-10-14' }, mockAuth);
    expect(result[0]).toMatchObject({ adUnitName: 'Homepage Leaderboard', fillRate: 0.92 });
  });
});
