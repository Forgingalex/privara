// Polyfill stub for global - webpack resolves this as a module
// In Node.js, 'global' is a global variable; in browsers we use window/globalThis
// This module is used by ProvidePlugin to inject 'global' wherever it's referenced

var g;

// Try to get the actual global object
if (typeof globalThis !== 'undefined') {
  g = globalThis;
} else if (typeof window !== 'undefined') {
  g = window;
} else if (typeof self !== 'undefined') {
  g = self;
} else if (typeof global !== 'undefined') {
  g = global;
} else {
  // Last resort - create an object
  g = {};
}

// Ensure global is available on the global object itself
if (typeof window !== 'undefined') {
  window.global = g;
}

// Export the global object
module.exports = g;

