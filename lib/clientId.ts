let counter = 0;

/**
 * A key that is unique within this page, for React lists and form remounts.
 * crypto.randomUUID() would also work, but browsers only provide it on HTTPS
 * and localhost, so it breaks when a phone opens the dev server by IP.
 */
export const nextClientId = (prefix = "id") => `${prefix}-${++counter}`;
