/* lightweight wrapper around fast-deep-equal to provide a typed import for TS files */
const isEqual = require('fast-deep-equal') as (..._args: any[]) => boolean;

export default isEqual;
