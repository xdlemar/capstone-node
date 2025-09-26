const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "../");

function ms(input, fallback) {
  if (!input) return fallback;
  const num = Number(input);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

const schedules = [
  {
    name: "inventory-low-stock",
    script: path.join(rootDir, "inventory-svc", "src", "jobs", "lowStock.js"),
    interval: ms(process.env.LOW_STOCK_INTERVAL_MS, 5 * 60 * 1000),
  },
  {
    name: "plt-delivery-alerts",
    script: path.join(rootDir, "plt-svc", "src", "jobs", "checkDelays.js"),
    interval: ms(process.env.PLT_ALERT_INTERVAL_MS, 5 * 60 * 1000),
  },
  {
    name: "alms-maintenance-alerts",
    script: path.join(rootDir, "alms-svc", "src", "jobs", "maintenanceAlerts.js"),
    interval: ms(process.env.ALMS_ALERT_INTERVAL_MS, 60 * 60 * 1000),
  },
];

function schedule({ name, script, interval }) {
  let isRunning = false;

  const run = () => {
    if (isRunning) {
      console.warn(`[jobs] ${name} is still running, skipping tick.`);
      return;
    }

    isRunning = true;
    const startedAt = new Date();
    console.log(`[jobs] starting ${name} at ${startedAt.toISOString()}`);

    const child = spawn(process.execPath, [script], {
      cwd: rootDir,
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code, signal) => {
      isRunning = false;
      const endedAt = new Date();
      const status = signal ? `signal ${signal}` : `code ${code}`;
      console.log(`[jobs] finished ${name} at ${endedAt.toISOString()} (${status})`);
    });
  };

  run();
  return setInterval(run, interval);
}

const timers = schedules.map(schedule);

function shutdown() {
  console.log("[jobs] shutting down background scheduler...");
  timers.forEach(clearInterval);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
