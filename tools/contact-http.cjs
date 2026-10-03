async function serveContact(req, res, { handler, maxBytes }) {
 res.status = code => { res.statusCode = code; return res; };
 res.json = body => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
 };
 try {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
   size += chunk.length;
   if (size > maxBytes) {
    res.status(413).json({ success: false, code: "body_too_large", message: "Die Anfrage ist zu gro\u00df." });
    return;
   }
   chunks.push(chunk);
  }
  req.body = Buffer.concat(chunks).toString("utf8");
  await handler(req, res);
 } catch (error) {
  console.error("Contact HTTP endpoint failed:", error.name);
  if (!res.headersSent) res.status(500).json({ success: false, code: "delivery_failed", message: "Die Anfrage konnte nicht verarbeitet werden." });
  else res.destroy();
 }
}
module.exports = { serveContact };
