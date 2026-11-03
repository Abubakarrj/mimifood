// Where the shop owes sales tax beyond California: each state's economic nexus threshold (sales
// into the state in a calendar year, this year or last; some also count orders, and two need
// both), checked against the shop's own orders. Thresholds change: check each state's revenue
// department before relying on them. Not tax advice.
//
// A state is charged only once the shop has registered there and turned "Collecting" on in the
// back office (Sales tax). Until then, passing a threshold sends the shop an email instead.

// [state, dollars, orders, "and" when both are needed]. null: no statewide sales tax.
const T = (dollars, orders = null, both = false) => ({ dollars, orders, both });
export const THRESHOLDS = {
  AL: T(250000), AK: T(100000), AZ: T(100000), AR: T(100000, 200), CA: T(500000), CO: T(100000),
  CT: T(100000, 200, true), DC: T(100000, 200), DE: null, FL: T(100000), GA: T(100000, 200),
  HI: T(100000, 200), ID: T(100000), IL: T(100000), IN: T(100000), IA: T(100000), KS: T(100000),
  KY: T(100000, 200), LA: T(100000), ME: T(100000), MD: T(100000, 200), MA: T(100000),
  MI: T(100000, 200), MN: T(100000, 200), MS: T(250000), MO: T(100000), MT: null, NE: T(100000, 200),
  NV: T(100000, 200), NH: null, NJ: T(100000, 200), NM: T(100000), NY: T(500000, 100, true),
  NC: T(100000), ND: T(100000), OH: T(100000, 200), OK: T(100000), OR: null, PA: T(100000),
  RI: T(100000, 200), SC: T(100000), SD: T(100000), TN: T(100000), TX: T(500000), UT: T(100000),
  VT: T(100000, 200), VA: T(100000, 200), WA: T(100000), WV: T(100000, 200), WI: T(100000),
  WY: T(100000),
};

// How far a state is toward its threshold, 0–1 (1 = passed): the higher of sales and orders,
// or the lower when both are needed.
export function progress(state, { sales, orders }) {
  const t = THRESHOLDS[state];
  if (!t) return 0;
  const bySales = sales / t.dollars;
  if (!t.orders) return bySales;
  const byOrders = orders / t.orders;
  return t.both ? Math.min(bySales, byOrders) : Math.max(bySales, byOrders);
}

// Sales and order counts by state and year from paid orders (sales before tax, with shipping).
export function salesByState(orders, years) {
  const rows = {};
  for (const o of orders) {
    if (o.payment !== "paid" && o.payment !== "partially_refunded") continue;
    if (o.status === "cancelled" || o.source === "wholesale" || o.parent) continue;
    const state = String(o.shipTo?.state || (o.fulfilment === "Pickup" || o.cafe ? "CA" : "")).toUpperCase();
    const year = Number(String(o.placedAt).slice(0, 4));
    if (!state || !years.includes(year)) continue;
    const r = (rows[state] ||= Object.fromEntries(years.map((y) => [y, { sales: 0, orders: 0 }])));
    r[year].sales += Math.max(0, (o.total || 0) - (o.tax || 0) - (o.refunded || 0));
    r[year].orders += 1;
  }
  return rows;
}
