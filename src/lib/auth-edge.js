/**
 * Edge-Runtime-safe auth constants.
 * lib/auth.js uses Node crypto + fs and can't be imported from middleware.
 */
export const AUTH_COOKIE_NAME = 'sp_auth'
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
