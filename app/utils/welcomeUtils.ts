// Utility functions for tracking welcome page status
const WELCOME_STORAGE_KEY = 'basedbills_welcome_seen';
const WELCOME_VERSION = '1.0'; // For future updates to welcome content

export interface WelcomeStatus {
  hasSeenWelcome: boolean;
  version: string;
  firstSeen?: number;
  lastSeen?: number;
}

/**
 * Check if user has seen the welcome page
 */
export function hasUserSeenWelcome(): boolean {
  if (typeof window === 'undefined') return false; // Server-side check

  try {
    const stored = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!stored) return false;

    const welcomeStatus: WelcomeStatus = JSON.parse(stored);

    // Check if the welcome version matches (for content updates)
    return welcomeStatus.hasSeenWelcome && welcomeStatus.version === WELCOME_VERSION;
  } catch (error) {
    console.error('Error reading welcome status:', error);
    return false;
  }
}

/**
 * Mark welcome page as seen
 */
export function markWelcomeAsSeen(): void {
  if (typeof window === 'undefined') return; // Server-side check

  try {
    const now = Date.now();
    const welcomeStatus: WelcomeStatus = {
      hasSeenWelcome: true,
      version: WELCOME_VERSION,
      firstSeen: hasUserSeenWelcome() ? undefined : now,
      lastSeen: now,
    };

    localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify(welcomeStatus));
  } catch (error) {
    console.error('Error saving welcome status:', error);
  }
}

/**
 * Reset welcome status (useful for testing or content updates)
 */
export function resetWelcomeStatus(): void {
  if (typeof window === 'undefined') return; // Server-side check

  try {
    localStorage.removeItem(WELCOME_STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting welcome status:', error);
  }
}

/**
 * Get detailed welcome status
 */
export function getWelcomeStatus(): WelcomeStatus {
  if (typeof window === 'undefined') {
    return { hasSeenWelcome: false, version: WELCOME_VERSION };
  }

  try {
    const stored = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!stored) {
      return { hasSeenWelcome: false, version: WELCOME_VERSION };
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading welcome status:', error);
    return { hasSeenWelcome: false, version: WELCOME_VERSION };
  }
}
