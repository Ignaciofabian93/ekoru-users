import { parseUserAgent } from './user-agent';

describe('parseUserAgent', () => {
  it('reads Chrome on Windows desktop', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.93 Safari/537.36',
      ),
    ).toEqual({
      browser: 'Chrome 138',
      operatingSystem: 'Windows 10/11',
      deviceKind: 'DESKTOP',
    });
  });

  it('reads Safari on iPhone as a mobile device', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({
      browser: 'Safari 17',
      operatingSystem: 'iOS 17',
      deviceKind: 'MOBILE',
    });
  });

  it('prefers Edge over the Chrome token it also carries', () => {
    const { browser } = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.3351.55',
    );
    expect(browser).toBe('Microsoft Edge 138');
  });

  it('prefers Opera over the Chrome token it also carries', () => {
    const { browser } = parseUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 OPR/122.0.0.0',
    );
    expect(browser).toBe('Opera 122');
  });

  it('treats an Android without the Mobile token as a tablet', () => {
    const { deviceKind } = parseUserAgent(
      'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    );
    expect(deviceKind).toBe('TABLET');
  });

  it('treats an Android with the Mobile token as a phone', () => {
    const { deviceKind, operatingSystem } = parseUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
    );
    expect(deviceKind).toBe('MOBILE');
    expect(operatingSystem).toBe('Android 14');
  });

  it('reads Firefox on macOS', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0',
      ),
    ).toEqual({
      browser: 'Firefox 129',
      operatingSystem: 'macOS 10',
      deviceKind: 'DESKTOP',
    });
  });

  it('falls back to unknown for a missing or unrecognised agent', () => {
    const unknown = {
      browser: 'Desconocido',
      operatingSystem: 'Desconocido',
      deviceKind: 'UNKNOWN',
    };
    expect(parseUserAgent(undefined)).toEqual(unknown);
    expect(parseUserAgent('')).toEqual(unknown);
    expect(parseUserAgent('curl/8.7.1')).toEqual(unknown);
  });
});
