// Application-wide constants

// Feature flags
export const IS_SERVER_MODE_COMING_SOON = true;

// Provider availability
export const PROVIDER_STATUS = {
  OPENAI: true,
  GEMINI: true,
  CLAUDE: true,
  IBM: false, // IBM WatsonX temporarily unavailable
};

// Connection modes
export const CONNECTION_MODES = {
  SERVER: 'server',
  BROWSER: 'browser',
};