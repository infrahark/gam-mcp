import { jest } from '@jest/globals';

const mockTokens = { access_token: 'tok', refresh_token: 'ref', expiry_date: Date.now() + 3600000 };
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
};
jest.unstable_mockModule('node:fs', () => ({ default: mockFs }));

const { loadTokens, saveTokens, getAccessToken, resolveClientId, _makeCallbackHandler } = await import('../src/auth.js');

describe('loadTokens', () => {
  it('returns null when token file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(loadTokens()).toBeNull();
  });

  it('returns parsed tokens when file exists', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ tokens: mockTokens, clientId: 'id' }));
    expect(loadTokens()).toEqual({ tokens: mockTokens, clientId: 'id' });
  });
});

describe('saveTokens', () => {
  it('creates directory and writes tokens', () => {
    mockFs.mkdirSync.mockReset();
    mockFs.writeFileSync.mockReset();
    saveTokens(mockTokens, 'my-client-id');
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.gam-mcp'), { recursive: true });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('tokens.json'),
      JSON.stringify({ tokens: mockTokens, clientId: 'my-client-id' })
    );
  });
});

describe('getAccessToken', () => {
  it('throws a human-readable message on invalid_grant', async () => {
    const badClient = {
      getAccessToken: jest.fn().mockRejectedValue(new Error('invalid_grant'))
    };
    await expect(getAccessToken(badClient)).rejects.toThrow('--setup');
  });
});

describe('saveTokens token-refresh merge', () => {
  it('does not crash when token file is missing during refresh', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReset();
    mockFs.writeFileSync.mockReset();

    expect(() => {
      const existing = loadTokens(); // returns null
      const newTokens = { access_token: 'new-tok' };
      saveTokens({ ...(existing?.tokens ?? {}), ...newTokens }, 'client-id');
    }).not.toThrow();

    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });
});

describe('_makeCallbackHandler', () => {
  it('ignores requests to paths other than /callback', () => {
    let resolved = false;
    const resolve = () => { resolved = true; };
    const reject = () => {};
    const mockServer = { close: jest.fn() };
    const handler = _makeCallbackHandler(resolve, reject, () => mockServer);

    const mockReq = { url: '/favicon.ico' };
    const mockRes = { writeHead: jest.fn(), end: jest.fn() };
    handler(mockReq, mockRes);

    expect(resolved).toBe(false);
    expect(mockServer.close).not.toHaveBeenCalled();
    expect(mockRes.writeHead).toHaveBeenCalledWith(204);
  });

  it('resolves with code for /callback requests', () => {
    let resolvedCode;
    const resolve = (c) => { resolvedCode = c; };
    const reject = () => {};
    const mockServer = { close: jest.fn() };
    const handler = _makeCallbackHandler(resolve, reject, () => mockServer);

    const mockReq = { url: '/callback?code=auth-code-123' };
    const mockRes = { writeHead: jest.fn(), end: jest.fn() };
    handler(mockReq, mockRes);

    expect(resolvedCode).toBe('auth-code-123');
    expect(mockServer.close).toHaveBeenCalled();
  });
});

describe('resolveClientId', () => {
  it('extracts client_id from installed key', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ installed: { client_id: 'abc' } }));
    expect(resolveClientId('/path/to/creds.json')).toBe('abc');
  });

  it('extracts client_id from web key', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ web: { client_id: 'xyz' } }));
    expect(resolveClientId('/path/to/creds.json')).toBe('xyz');
  });

  it('throws on unrecognized shape', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ something_else: {} }));
    expect(() => resolveClientId('/path/to/creds.json')).toThrow('Could not find client_id');
  });
});
