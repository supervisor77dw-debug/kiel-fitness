const { checkHighLevelReadiness } = require("../lib/highlevel");
let lastCheck;
let lastCheckAt = 0;

module.exports = async function highLevelReadiness(req, res) {
 res.setHeader("Cache-Control", "no-store");
 res.setHeader("X-Content-Type-Options", "nosniff");
 if (req.method !== "GET") {
  res.setHeader("Allow", "GET");
  return res.status(405).json({ ready: false, error: "method_not_allowed" });
 }
 if (lastCheck && Date.now() - lastCheckAt < 5 * 60 * 1000) {
  return res.status(lastCheck.status).json(lastCheck.body);
 }
 const result = await checkHighLevelReadiness();
 lastCheck = result;
 lastCheckAt = Date.now();
 return res.status(result.status).json(result.body);
};
