const express = require("express");
const crypto = require("crypto");

const router = express.Router();

// Capture raw body for HMAC verification
router.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf ? buf.toString("utf8") : "";
    },
  })
);

// Hardcoded shared secret for Core2 HMAC integration.
const CORE2_SECRET = "CHANGE_ME_CORE2";
const CORE2_TTL_MS = Number(process.env.CORE2_HMAC_TTL_MS || 5 * 60 * 1000);

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(a || "", "utf8");
  const bBuf = Buffer.from(b || "", "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyHmac(req) {
  if (!CORE2_SECRET) {
    return { ok: false, error: "CORE2_HMAC_SECRET not set" };
  }

  const ts = req.headers["x-core2-timestamp"];
  const sig = req.headers["x-core2-signature"];
  if (!ts || !sig) return { ok: false, error: "Missing HMAC headers" };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, error: "Invalid timestamp" };

  const now = Date.now();
  if (Math.abs(now - tsNum) > CORE2_TTL_MS) {
    return { ok: false, error: "Timestamp expired" };
  }

  const raw = req.rawBody || "";
  const base = `${ts}.${raw}`;
  const expected = crypto.createHmac("sha256", CORE2_SECRET).update(base).digest("hex");
  const ok = timingSafeEqual(expected, String(sig));
  return ok ? { ok: true } : { ok: false, error: "Invalid signature" };
}

function requireString(value, field) {
  if (!value || typeof value !== "string") {
    throw Object.assign(new Error(`${field} is required`), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  return value.trim();
}

function getServiceToken(rolesOverride) {
  const jwt = require("jsonwebtoken");
  const JWT_SECRET = process.env.JWT_SECRET || "super_secret_dev";
  const roles = Array.isArray(rolesOverride) && rolesOverride.length ? rolesOverride : ["ADMIN"];
  return jwt.sign({ sub: "core2-gateway", roles }, JWT_SECRET, { expiresIn: "5m" });
}

async function callJson(url, payload, rolesOverride) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${getServiceToken(rolesOverride)}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text().catch(() => "");
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!resp.ok) {
    const err = new Error(`Upstream ${resp.status}`);
    err.status = resp.status;
    err.body = text;
    throw err;
  }
  return json;
}

async function postInventoryItem(url, payload, rolesOverride) {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${getServiceToken(rolesOverride)}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await resp.text().catch(() => "");
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!resp.ok) {
    const err = new Error(`Upstream ${resp.status}`);
    err.status = resp.status;
    err.body = text;
    throw err;
  }
  return { status: resp.status, json };
}

async function getJson(url) {
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getServiceToken()}`,
    },
  });
  const text = await resp.text().catch(() => "");
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!resp.ok) {
    const err = new Error(`Upstream ${resp.status}`);
    err.status = resp.status;
    err.body = text;
    throw err;
  }
  return json;
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function resolveLocationId(value, locations) {
  if (!value) return null;
  const raw = String(value).trim();
  if (raw === "") return null;
  if (/^\d+$/.test(raw)) {
    const match = locations.find((loc) => String(loc.id) === raw);
    return match ? match.id : null;
  }
  const key = normalizeKey(raw);
  const match = locations.find((loc) => normalizeKey(loc.name) === key);
  return match ? match.id : null;
}

// Core2 -> Logistics2 request
// POST /api/core2/requests
router.post("/requests", async (req, res) => {
  try {
    const auth = verifyHmac(req);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error });

    const body = req.body || {};
    const prNo = requireString(body.prNo, "prNo");
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (!lines.length) {
      return res.status(400).json({ ok: false, error: "lines[] required" });
    }

    const procurementBase = process.env.PROCUREMENT_URL || "http://127.0.0.1:4002";
    const inventoryBase = process.env.INVENTORY_URL || "http://127.0.0.1:4001";

    // 1) Resolve itemIds (accept itemId, sku, or name)
    const lookup = await getJson(`${inventoryBase}/lookups/inventory`);
    const items = Array.isArray(lookup?.items) ? lookup.items : [];
    const bySku = new Map(items.map((it) => [normalizeKey(it.sku), it]));
    const byName = new Map(items.map((it) => [normalizeKey(it.name), it]));

    const resolvedLines = [];
    const missing = [];
    for (const line of lines) {
      const qty = line?.qty;
      const unit = line?.unit;
      const notes = line?.notes ?? null;
      let item = null;
      if (line?.itemId) {
        item = items.find((it) => String(it.id) === String(line.itemId)) || null;
      } else if (line?.sku) {
        item = bySku.get(normalizeKey(line.sku)) || null;
      } else if (line?.name) {
        item = byName.get(normalizeKey(line.name)) || null;
      }

      if (!item) {
        missing.push({ line });
        continue;
      }

      resolvedLines.push({
        itemId: item.id,
        qty,
        unit: unit || item.unit || "",
        notes,
      });
    }

    if (missing.length) {
      return res.status(422).json({
        ok: false,
        error: "Some items were not found in Inventory. Use sku/name that exists in Log2.",
        missing,
      });
    }

    // 2) Create PR
    const prPayload = { prNo, notes: body.notes || null, lines: resolvedLines };
    const pr = await callJson(`${procurementBase}/pr`, prPayload);

    let approveResult = null;
    let issueResult = null;

    // 2) Optional approve + issue
    if (body.autoApprove === true) {
      approveResult = await callJson(`${procurementBase}/pr/${encodeURIComponent(prNo)}/approve`, {});
    }

    if (body.issue && body.issue.issueNo && body.issue.fromLocId && body.issue.toLocId) {
      issueResult = await callJson(`${inventoryBase}/issues`, body.issue);
    }

    // 3) Optional callback to Core2
    if (body.callbackUrl) {
      fetch(body.callbackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: true,
          prNo,
          created: pr,
          approved: approveResult,
          issue: issueResult,
          ts: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    res.json({
      ok: true,
      prNo,
      created: pr,
      approved: approveResult,
      issue: issueResult,
    });
  } catch (err) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    res.status(status).json({ ok: false, error: err?.message || "Internal error", details: err?.body });
  }
});

// Core2 -> Logistics2 transfer request (Inventory queue)
// POST /api/core2/transfers
router.post("/transfers", async (req, res) => {
  try {
    const auth = verifyHmac(req);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error });

    const body = req.body || {};
    const transferNo = requireString(body.transferNo || body.refNo || `T-CORE2-${Date.now()}`, "transferNo");
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (!lines.length) {
      return res.status(400).json({ ok: false, error: "lines[] required" });
    }

    const inventoryBase = process.env.INVENTORY_URL || "http://127.0.0.1:4001";
    const lookup = await getJson(`${inventoryBase}/lookups/inventory`);
    const items = Array.isArray(lookup?.items) ? lookup.items : [];
    const locations = Array.isArray(lookup?.locations) ? lookup.locations : [];

    const bySku = new Map(items.map((it) => [normalizeKey(it.sku), it]));
    const byName = new Map(items.map((it) => [normalizeKey(it.name), it]));

    const resolvedLines = [];
    const missing = [];
    for (const line of lines) {
      const qty = line?.qty;
      const strength = line?.strength ? String(line.strength).trim() : "";
      let notes = line?.notes ?? null;
      let item = null;
      if (line?.itemId) {
        item = items.find((it) => String(it.id) === String(line.itemId)) || null;
      } else if (line?.sku) {
        item = bySku.get(normalizeKey(line.sku)) || null;
      } else if (line?.name) {
        item = byName.get(normalizeKey(line.name)) || null;
      }

      if (!item) {
        missing.push({ line });
        continue;
      }

      if (strength) {
        const existingStrength = item.strength ? String(item.strength).trim() : "";
        if (existingStrength !== strength) {
          await callJson(
            `${inventoryBase}/items`,
            {
              sku: item.sku,
              name: item.name,
              unit: item.unit,
              minQty: item.minQty || 0,
              type: "medicine",
              strength,
            },
            ["ADMIN"]
          );
        }
        if (!notes) {
          notes = `strength:${strength}`;
        }
      }

      resolvedLines.push({
        itemId: item.id,
        qty,
        notes,
      });
    }

    if (missing.length) {
      return res.status(422).json({
        ok: false,
        error: "Some items were not found in Inventory. Use sku/name that exists in Log2.",
        missing,
      });
    }

    const fromLocRaw =
      body.fromLocId || body.fromLocName || process.env.CORE2_DEFAULT_FROM_LOC || "";
    const toLocRaw =
      body.toLocId || body.toLocName || process.env.CORE2_DEFAULT_TO_LOC || "";

    const fromLocId = resolveLocationId(fromLocRaw, locations);
    const toLocId = resolveLocationId(toLocRaw, locations);

    if (!fromLocId || !toLocId) {
      return res.status(400).json({
        ok: false,
        error: "fromLocId/fromLocName and toLocId/toLocName required (or set CORE2_DEFAULT_FROM_LOC/CORE2_DEFAULT_TO_LOC)",
      });
    }

    const payload = {
      transferNo,
      fromLocId,
      toLocId,
      notes: body.notes || "Core2 transfer request",
      lines: resolvedLines,
    };

    // Use STAFF role so it shows in approvals queue
    const transfer = await callJson(`${inventoryBase}/transfers`, payload, ["STAFF"]);

    if (body.callbackUrl) {
      fetch(body.callbackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: true,
          transferNo,
          transfer,
          ts: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    res.json({ ok: true, transferNo, transfer });
  } catch (err) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    res.status(status).json({ ok: false, error: err?.message || "Internal error", details: err?.body });
  }
});

// Core2 -> Logistics2 item master sync
// POST /api/core2/items-sync
router.post("/items-sync", async (req, res) => {
  try {
    const auth = verifyHmac(req);
    if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error });

    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return res.status(400).json({ ok: false, error: "items[] required" });
    }

    const inventoryBase = process.env.INVENTORY_URL || "http://127.0.0.1:4001";
    let created = 0;
    let updated = 0;

    for (const it of items) {
      const sku = String(it.sku || "").trim();
      const name = String(it.name || "").trim();
      const unit = String(it.unit || "").trim();
      if (!sku || !name || !unit) continue;

      const payload = {
        sku,
        name,
        unit,
        minQty: Number(it.minQty || 0),
        type: "medicine",
        strength: it.strength ? String(it.strength) : null,
      };

      const result = await postInventoryItem(`${inventoryBase}/items`, payload, ["ADMIN"]);
      if (result.status === 201) created += 1;
      else updated += 1;
    }

    res.json({ ok: true, created, updated, total: created + updated });
  } catch (err) {
    const status = err?.status && Number.isFinite(err.status) ? err.status : 500;
    res.status(status).json({ ok: false, error: err?.message || "Internal error", details: err?.body });
  }
});

module.exports = router;
