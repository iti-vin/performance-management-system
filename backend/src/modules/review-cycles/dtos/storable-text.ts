/** A text that PostgreSQL can store: no NUL character, like the shared `storableTextSchema`. */
// eslint-disable-next-line no-control-regex
export const STORABLE_TEXT = /^[^\u0000]*$/;

/** The words of the shared `storableTextSchema`. */
export const STORABLE_TEXT_MESSAGE = 'Remove the character that cannot be saved.';
