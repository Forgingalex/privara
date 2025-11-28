// Polyfill stub for globalThis - webpack resolves this as a module
// In modern browsers, globalThis is a native global variable
if (typeof globalThis === 'undefined') {
  if (typeof window !== 'undefined') {
    window.globalThis = window;
  } else if (typeof global !== 'undefined') {
    global.globalThis = global;
  } else if (typeof self !== 'undefined') {
    self.globalThis = self;
  } else {
    throw new Error('Unable to polyfill globalThis');
  }
}

module.exports = globalThis;


