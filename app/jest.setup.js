// Stub out Expo's winter runtime globals that are incompatible with Jest's module sandbox
global.__ExpoImportMetaRegistry = { url: '' };
// Prevent Expo SDK 52+ winter runtime lazy getters from triggering outside Jest module scope
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}
