const http = require("http");
const { execFile } = require("child_process");
const crypto = require("crypto");
const path = require("path");

const PORT = Number(process.env.SALES_DEPLOY_WEBHOOK_PORT || 9010);
const SECRET = process.env.SALES_DEPLOY_WEBHOOK_TOKEN;
const DEPLOY_SCRIPT = process.env.SALES_DEPLOY_SCRIPT || path.join(__dirname, "sales-deploy.sh");
const TIMEOUT_MS = Number(process.env.SALES_DEPLOY_TIMEOUT_MS || 20 * 60 * 1000);

let activeRun = null;
let lastRun = null;

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function isAuthorized(req) {
  if (!SECRET) return false;
  const expected = `Bearer ${SECRET}`;
  const actual = String(req.headers.authorization || "");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function publicRun(run) {
  if (!run) return null;
  return {
    id: run.id,
    status: run.status,
    sha: run.sha,
    ref: run.ref,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    exitCode: run.exitCode,
    error: run.error,
    outputTail: run.output.slice(-12000),
  };
}

async function triggerDeploy(req, res) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { success: false, message: "Unauthorized" });
    return;
  }

  let payload = {};
  try {
    const rawBody = await readBody(req);
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    sendJson(res, 400, { success: false, message: "Invalid JSON payload" });
    return;
  }

  if (activeRun) {
    sendJson(res, 409, { success: false, message: "Deployment already running", run: publicRun(activeRun) });
    return;
  }

  const run = {
    id: crypto.randomUUID(),
    status: "running",
    sha: String(payload.sha || ""),
    ref: String(payload.ref || ""),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    error: null,
    output: "",
  };

  activeRun = run;
  lastRun = run;

  const child = execFile("/bin/bash", [DEPLOY_SCRIPT], {
    timeout: TIMEOUT_MS,
    maxBuffer: 30 * 1024 * 1024,
    env: {
      ...process.env,
      GITHUB_SHA: run.sha,
      GITHUB_REF: run.ref,
    },
  }, (error, stdout, stderr) => {
    run.output += stdout || "";
    run.output += stderr || "";
    run.finishedAt = new Date().toISOString();
    run.exitCode = error && typeof error.code === "number" ? error.code : 0;
    run.status = error ? "failed" : "success";
    run.error = error ? error.message : null;
    activeRun = null;

    if (error) {
      console.error(`[${run.finishedAt}] Sales CRM deploy failed`, error.message);
    } else {
      console.log(`[${run.finishedAt}] Sales CRM deploy succeeded`);
    }
  });

  child.stdout?.on("data", (chunk) => {
    run.output += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    run.output += chunk.toString();
  });

  sendJson(res, 202, { success: true, message: "Deployment triggered", run: publicRun(run) });
}

function status(req, res) {
  if (!isAuthorized(req)) {
    sendJson(res, 401, { success: false, message: "Unauthorized" });
    return;
  }
  sendJson(res, 200, { success: true, run: publicRun(lastRun) });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/deploy") {
    void triggerDeploy(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    status(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { success: true, message: "OK" });
    return;
  }

  sendJson(res, 404, { success: false, message: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Sales CRM deploy webhook listening on 127.0.0.1:${PORT}`);
});
