// Minimal Server-Sent Events hub. One channel per concern (counter, data) —
// each channel just tracks its own connected `res` objects and writes
// `event:`/`data:` frames to all of them on broadcast.
function createChannel() {
  const clients = new Set();

  function addClient(req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("\n");
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
  }

  function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) {
      res.write(payload);
    }
  }

  return { addClient, broadcast };
}

module.exports = { createChannel };
