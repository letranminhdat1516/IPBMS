// Application constants
export const APP_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  JWT_HEADER: 'Authorization',
  API_PREFIX: 'api',
  SWAGGER_PATH: 'docs',
} as const;

// Event types
export const EVENT_TYPES = {
  FALL: 'fall',
  CONVULSION: 'convulsion',
  STAGGER: 'stagger',
  VISITOR: 'visitor',
  UNKNOWN: 'unknown',
} as const;

// User roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  CAREGIVER: 'caregiver',
  ADMIN: 'admin',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
