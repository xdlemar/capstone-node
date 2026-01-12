// tests/smoke.js (CommonJS)
const jwt = require("jsonwebtoken");
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:8080";
const JWT_SECRET  = process.env.JWT_SECRET  || "super_secret_dev";
const ITEM_ID     = Number(process.env.ITEM_ID)     || 1;
const FROM_LOC_ID = Number(process.env.FROM_LOC_ID) || 1;
const TO_LOC_ID   = Number(process.env.TO_LOC_ID)   || 2;

function token() {
  return jwt.sign({ sub: "student1", name: "Smoke Runner", roles: ["ADMIN","MANAGER","STAFF"] }, JWT_SECRET);
}

async function http(method, path, body, {auth=true} = {}) {
  const headers = { "content-type": "application/json" };
  if (auth) headers.authorization = `Bearer ${token()}`;
  const res = await fetch(`${GATEWAY_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  const data = txt ? (()=>{ try{return JSON.parse(txt);}catch{return {raw:txt};} })() : null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${res.statusText} (${data?.error||res.statusText})`);
  return data;
}

function rnd(p){ return `${p}-${Math.floor(Math.random()*1e9)}`; }
const log = (c,msg)=>console.log(`${c}%s\x1b[0m`, msg);
const green = (m)=>log("\x1b[32m", m);
const cyan  = (m)=>log("\x1b[36m", m);
const red   = (m)=>log("\x1b[31m", m);

(async () => {
  try {
    cyan("Smoke: Procurement + Inventory via Gateway");
    await http("GET","/api/inventory/health"); await http("GET","/api/procurement/health"); green("✓ health OK");

    const vendor = await http("POST","/api/procurement/vendors",{ name:"MedSupply Co.", email:"sales@medsupply.local" });
    green(`✓ vendor upserted: id=${vendor.id}`);

    const PR = rnd("PR");
    const pr = await http("POST","/api/procurement/pr",{ prNo:PR, notes:"ER resupply", lines:[{ itemId:ITEM_ID, qty:500, unit:"pack" }] });
    if (pr.status!=="SUBMITTED") throw new Error(`PR status ${pr.status}`); green(`✓ PR created: ${pr.prNo}`);
    await http("POST",`/api/procurement/pr/${PR}/approve`); green("✓ PR approved");

    const PO = rnd("PO");
    const po = await http("POST","/api/procurement/po",{ poNo:PO, prNo:PR, vendorId: vendor.id }); if (po.status!=="OPEN") throw new Error(`PO ${po.status}`);
    green(`✓ PO created: ${po.poNo}`);

    const DR = rnd("DR");
    await http("POST","/api/procurement/receipts",{ poNo:PO, drNo:DR, invoiceNo:`INV-${DR}` }); green(`✓ receipt posted: ${DR}`);

    const att = await http("POST","/api/procurement/attachments",{ targetType:"PO", targetNo:PO, kind:"DR", mimeType:"application/pdf" });
    green(`✓ attachment added: ${att.fileName} -> ${att.storageKey}`);
    const list = await http("GET",`/api/procurement/attachments?poNo=${encodeURIComponent(PO)}`); if (!list.length) throw new Error("no attachments");
    green(`✓ attachments listed: count=${list.length}`);

    const ISSUE = rnd("ISS");
    const issue = await http("POST","/api/inventory/issues",{ issueNo:ISSUE, fromLocId:FROM_LOC_ID, toLocId:TO_LOC_ID, lines:[{ itemId:ITEM_ID, qty:3 }] });
    if (Number(issue?.lines?.[0]?.qtyIssued)!==3) throw new Error("qtyIssued mismatch");
    green(`✓ issue created: ${ISSUE}`);

    const CNT = rnd("CNT");
    green(`✓ count posted: ${CNT}`);

    green("\n✔ SMOKE PASS"); process.exit(0);
  } catch (e) { red(`\n✖ SMOKE FAIL: ${e.message}`); process.exit(1); }
})();

