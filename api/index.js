// Vercel serverless entrypoint — the whole Express app as one catch-all
// function (see vercel.json's rewrite). `server/app.js` has no .listen()
// call (built for supertest originally), which turns out to make this
// trivial: an Express app is already a valid (req, res) handler.
//
// One thing this can't just copy from server/index.js: sharedRegistry's
// metric registry loads via a dynamic import of an ESM file, kicked off at
// module load but not guaranteed to have resolved yet. Locally, index.js
// awaits `ready` once before ever calling app.listen, so every request is
// safe. Here there's no such gate — a cold-start invocation could otherwise
// race ahead of the import and hit assertReady()'s throw. So every
// invocation awaits the (cached, instant-after-first-resolve) promise
// before handing off to Express.
const app = require("../server/app.js");
const sharedRegistry = require("../server/data/sharedRegistry.js");

module.exports = async (req, res) => {
  await sharedRegistry.ready;
  app(req, res);
};
