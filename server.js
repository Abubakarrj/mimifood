// Starts the server, written in TypeScript (server.ts). Node runs the .ts files directly.
// Node calls stripTypeScriptTypes (used to send the browser scripts) experimental; that notice
// would print on every start, so it's left out. Other warnings still show.
const warn = process.emitWarning;
process.emitWarning = (warning, ...rest) => (String(warning?.message ?? warning).includes("stripTypeScriptTypes") ? undefined : warn.call(process, warning, ...rest));
await import("./server.ts");
