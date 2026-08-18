const app = require("./app");
const sharedRegistry = require("./data/sharedRegistry");

const PORT = process.env.PORT || 4000;

// The shared metric registry is genuine ESM (so the Vite client can import
// the exact same source with no build step); this CJS server bridges it via
// a dynamic import that must resolve before any request can be served.
sharedRegistry.ready.then(() => {
  app.listen(PORT, () => {
    console.log(`StyleCraft 360 API listening on http://localhost:${PORT}`);
  });
});
