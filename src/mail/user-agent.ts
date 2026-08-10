import type { DeviceKind } from './templates/login-alert.templates';

export interface ParsedUserAgent {
  browser: string;
  operatingSystem: string;
  deviceKind: DeviceKind;
}

const UNKNOWN: ParsedUserAgent = {
  browser: 'Desconocido',
  operatingSystem: 'Desconocido',
  deviceKind: 'UNKNOWN',
};

/**
 * Browsers, most specific first — Edge and Opera both carry "Chrome" in their
 * UA, and Chrome carries "Safari", so order is what makes this correct.
 */
const BROWSERS: Array<[RegExp, string]> = [
  [/EdgA?\/([\d.]+)/, 'Microsoft Edge'],
  [/OPR\/([\d.]+)/, 'Opera'],
  [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
  [/Firefox\/([\d.]+)/, 'Firefox'],
  [/CriOS\/([\d.]+)/, 'Chrome'],
  [/FxiOS\/([\d.]+)/, 'Firefox'],
  [/Chrome\/([\d.]+)/, 'Chrome'],
  [/Version\/([\d.]+).*Safari/, 'Safari'],
  [/Safari\/([\d.]+)/, 'Safari'],
];

const OPERATING_SYSTEMS: Array<[RegExp, string]> = [
  [/Windows NT 10\.0/, 'Windows 10/11'],
  [/Windows NT 6\.3/, 'Windows 8.1'],
  [/Windows NT 6\.1/, 'Windows 7'],
  [/Windows NT/, 'Windows'],
  [/Android ([\d.]+)/, 'Android'],
  // iPadOS ≥13 reports as Macintosh, so iPad must be matched before macOS.
  [/(iPhone|iPad|iPod).*OS ([\d_]+)/, 'iOS'],
  [/Mac OS X ([\d_.]+)/, 'macOS'],
  [/Mac OS X/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Ubuntu/, 'Ubuntu'],
  [/Linux/, 'Linux'],
];

/**
 * Minimal User-Agent parser for the login-alert email.
 *
 * Deliberately dependency-free: this feeds a human-readable line in a security
 * notice, not analytics or access control, so "good enough to recognise your
 * own device" is the bar. The raw UA travels alongside it in the email for
 * anything this misses.
 */
export function parseUserAgent(
  userAgent: string | null | undefined,
): ParsedUserAgent {
  if (!userAgent) return UNKNOWN;

  let browser = UNKNOWN.browser;
  for (const [pattern, name] of BROWSERS) {
    const match = pattern.exec(userAgent);
    if (match) {
      browser = match[1] ? `${name} ${major(match[1])}` : name;
      break;
    }
  }

  let operatingSystem = UNKNOWN.operatingSystem;
  for (const [pattern, name] of OPERATING_SYSTEMS) {
    const match = pattern.exec(userAgent);
    if (match) {
      // iOS captures the version in group 2 (group 1 is the device), the rest
      // in group 1. Underscores are how Apple writes them.
      const version = name === 'iOS' ? match[2] : match[1];
      operatingSystem = version
        ? `${name} ${major(version.replace(/_/g, '.'))}`
        : name;
      break;
    }
  }

  return { browser, operatingSystem, deviceKind: detectDeviceKind(userAgent) };
}

function detectDeviceKind(userAgent: string): DeviceKind {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(userAgent)) {
    return 'TABLET';
  }
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent)) {
    return 'MOBILE';
  }
  if (/Windows|Macintosh|Linux|CrOS|X11/i.test(userAgent)) {
    return 'DESKTOP';
  }
  return 'UNKNOWN';
}

/** "138.0.7204.93" → "138". Patch versions add noise, not recognition. */
function major(version: string): string {
  return version.split('.')[0];
}
