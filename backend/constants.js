/** Default max distance (meters) for proximity-based discovery when not set in user preferences. */
const DEFAULT_MAX_DISTANCE_METERS = 30;

/** Minutes after which a match entry is considered expired and hidden/removed. */
const MATCH_EXPIRY_MINUTES = 30;

/** Max new matches a user can create per calendar day (UTC). */
const MAX_MATCHES_PER_DAY = 5;

module.exports = { DEFAULT_MAX_DISTANCE_METERS, MATCH_EXPIRY_MINUTES, MAX_MATCHES_PER_DAY };
