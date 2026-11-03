// Shipping labels through ShipStation's API (v1, https://www.shipstation.com/docs/api/).
// Set SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET (ShipStation → Settings → Account →
// API Settings). SHIPSTATION_TEST_LABELS=true buys free test labels while setting up.

export const shipstationConfigured = () => Boolean(process.env.SHIPSTATION_API_KEY && process.env.SHIPSTATION_API_SECRET);
export const testLabels = () => process.env.SHIPSTATION_TEST_LABELS === "true";

export class ShipStationError extends Error {}

async function call(method, path, body?) {
  const base = (process.env.SHIPSTATION_API_URL || "https://ssapi.shipstation.com").replace(/\/$/, "");
  const auth = Buffer.from(`${process.env.SHIPSTATION_API_KEY}:${process.env.SHIPSTATION_API_SECRET}`).toString("base64");
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* plain-text error */
  }
  if (!res.ok) {
    const message = data?.ExceptionMessage || data?.Message || data?.message || "";
    throw new ShipStationError(res.status === 401 ? "ShipStation isn't connected properly." : message ? `ShipStation: ${String(message).slice(0, 200)}` : "ShipStation couldn't do that. Try again.");
  }
  return data;
}

// Carriers connected to the ShipStation account (USPS, UPS, FedEx, …).
export const carriers = () => call("GET", "/carriers");

const toAddress = (a) => ({
  name: a.name,
  company: a.company || null,
  street1: a.street1,
  street2: a.street2 || null,
  city: a.city,
  state: a.state,
  postalCode: a.postalCode,
  country: a.country || "US",
  phone: a.phone || null,
  residential: a.residential ?? true,
});

// Every connected carrier's rates for one parcel, cheapest first.
export async function rates({ shipFrom, shipTo, weightOz }) {
  const list = await carriers();
  const results = await Promise.allSettled(
    list.map(async (c) => {
      const quotes = await call("POST", "/shipments/getrates", {
        carrierCode: c.code,
        serviceCode: null,
        packageCode: null,
        fromPostalCode: shipFrom.postalCode,
        toState: shipTo.state,
        toCountry: shipTo.country || "US",
        toPostalCode: shipTo.postalCode,
        toCity: shipTo.city,
        weight: { value: weightOz, units: "ounces" },
        confirmation: "none",
        residential: true,
      });
      return quotes.map((q) => ({
        carrierCode: c.code,
        carrierName: c.name,
        serviceCode: q.serviceCode,
        serviceName: q.serviceName,
        cost: Math.round((Number(q.shipmentCost) + Number(q.otherCost || 0)) * 100) / 100,
      }));
    })
  );
  const quotes = results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  if (!quotes.length) {
    const failed = results.find((r) => r.status === "rejected");
    throw failed ? failed.reason : new ShipStationError("No carriers are connected to ShipStation yet.");
  }
  return quotes.sort((a, b) => a.cost - b.cost);
}

// Buys a label. Returns the tracking number, cost and the label as a base64 PDF.
export async function createLabel({ carrierCode, serviceCode, shipFrom, shipTo, weightOz, orderNumber }: { carrierCode?: any; serviceCode?: any; shipFrom: any; shipTo: any; weightOz: any; orderNumber?: any; [k: string]: any }) {
  const label = await call("POST", "/shipments/createlabel", {
    carrierCode,
    serviceCode,
    packageCode: "package",
    confirmation: "none",
    shipDate: new Date().toISOString().slice(0, 10),
    weight: { value: weightOz, units: "ounces" },
    shipFrom: toAddress(shipFrom),
    shipTo: toAddress(shipTo),
    advancedOptions: { customField1: orderNumber },
    testLabel: testLabels(),
  });
  return {
    shipmentId: label.shipmentId,
    trackingNumber: label.trackingNumber,
    cost: Math.round((Number(label.shipmentCost) + Number(label.insuranceCost || 0)) * 100) / 100,
    pdf: label.labelData,
  };
}

export async function voidLabel(shipmentId) {
  const result = await call("POST", "/shipments/voidlabel", { shipmentId });
  if (!result?.approved) throw new ShipStationError(result?.message || "ShipStation didn't approve voiding this label.");
  return result;
}

// ShipStation carrier codes → the carrier names used for tracking links.
export const trackingCarrier = (code) =>
  ({ stamps_com: "USPS", usps: "USPS", endicia: "USPS", ups: "UPS", ups_walleted: "UPS", fedex: "FedEx", fedex_walleted: "FedEx", dhl_express: "DHL", dhl_express_worldwide: "DHL" })[code] || "Other";
