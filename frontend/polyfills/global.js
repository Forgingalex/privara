// Polyfill stub for global - webpack resolves this as a module
// In Node.js, 'global' is a global variable; in browsers we use window/globalThis
if (typeof global === 'undefined') {
  if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    global = globalThis;
  } else if (typeof window !== 'undefined') {
    // @ts-ignore
    global = window;
  } else if (typeof self !== 'undefined') {
    // @ts-ignore
    global = self;
  } else {
    throw new Error('Unable to polyfill global');
  }
}

module.exports = global;

