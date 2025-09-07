const { authed } = require("./request");

describe("Inventory setup", () => {
  it("upsert item (sku unique)", async () => {
    const res = await authed()
      .post("/api/inventory/items")
      .send({ sku: "GAUZE-4X4", name: "Gauze 4x4", unit: "pack", minQty: 200 });
    expect([200,201]).toContain(res.status);
    expect(res.body.sku).toBe("GAUZE-4X4");
  });

  it("create locations (idempotent by name)", async () => {
    const w1 = await authed().post("/api/inventory/locations").send({ name: "Main Warehouse", kind: "WAREHOUSE" });
    const w2 = await authed().post("/api/inventory/locations").send({ name: "ER Storage", kind: "ROOM" });
    // Your services return 201 on first, 409 on duplicates with error message
    expect([201,409]).toContain(w1.status);
    expect([201,409]).toContain(w2.status);
  });
});
