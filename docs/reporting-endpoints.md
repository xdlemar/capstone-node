# Reporting Dashboard Extensions

This release adds richer cost rollups to the logistics (PLT) and asset lifecycle (ALMS) dashboards. The
new fields are designed so future teams can extend analytics without reverse-engineering the APIs.

## Project Logistics (PLT)

**Endpoint**: `GET /plt/dashboard/summary`

The existing payload now includes a `deliveryCosts` object:

```jsonc
{
  "deliveryCosts": {
    "totalDeliverySpend": 45230.12,
    "perProject": [
      {
        "projectId": "101",
        "code": "PRJ-NEURO",
        "name": "Neuro OR Upgrade",
        "status": "ACTIVE",
        "budget": 120000,
        "deliveryCost": 18750.5
      }
    ]
  }
}
```

- `totalDeliverySpend` is the grand total of all `ProjectCost` rows where `sourceType === 'DELIVERY'`.
- `perProject` lists the top projects ranked by delivery spend (currently capped at five entries).
- Budgets are surfaced when available so downstream tooling can calculate burn ratios.

## Asset Lifecycle & Maintenance (ALMS)

**Endpoint**: `GET /alms/dashboard/summary`

The response now contains a `financials` block summarising asset value and maintenance outlay:

```jsonc
{
  "financials": {
    "acquisitionValue": 982345.67,
    "bookValue": 754120.13,
    "maintenanceCost30d": 1420.0,
    "maintenanceCostYtd": 18450.25,
    "topAssetsByMaintenance": [
      {
        "assetId": "88",
        "assetCode": "MRI-02",
        "status": "ACTIVE",
        "category": "Imaging",
        "spendYtd": 9250.0
      }
    ]
  }
}
```

- `acquisitionValue` and `bookValue` are derived from the asset register and accumulated depreciation.
- `maintenanceCost30d` and `maintenanceCostYtd` blend repair logs with completed work-order costs.
- `topAssetsByMaintenance` highlights the highest cost assets year-to-date.

### Notes for Future Work

- Both endpoints deliberately keep raw numeric values (no currency codes) so consumers can apply their
  own localisation/forecasting rules.
- If additional analytics are required (e.g., time-series or per-vendor views), the aggregation queries
  live in `plt-svc/src/routes/dashboard.js` and `alms-svc/src/routes/dashboard.js`.
- Tests rely on the existing service contracts; no schema migrations were necessary.
