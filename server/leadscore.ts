// Lead score: how likely someone is to buy (or buy again), 0 to 100, with the reasons in plain
// words, for Customers, Wholesale and the Inbox. Fit counts up to 40 and engagement up to 60, so
// someone keen who hasn't bought yet can still score High:
//
//   fit         can and does spend: what they've spent, how often, a subscription, a wholesale
//               account in good standing
//   engagement  what they're doing lately (30 days): pages and time on the site (signed in, with
//               analytics allowed), cart adds, messages, how fast they reply, and what their
//               messages are about (intent, tagged by Claude)
//
// The weights are set by hand for now. Once there are a couple of hundred outcomes (bought /
// didn't), they can be fitted to the sales history; the features stay the same.

export const INTENTS = ["ready", "pricing", "question", "complaint", "leaving", "other"];

export type LeadFeatures = {
  orders?: number;
  spent?: number;
  lastOrderAt?: string | null;
  subscriptions?: number;
  wholesale?: boolean;
  overdue?: number; // wholesale invoices past due
  views?: number; // pages, last 30 days
  seconds?: number; // time on those pages
  cartAdds?: number;
  messages?: number; // theirs, last 30 days, any channel
  replyMinutes?: number | null; // their typical reply time to us
  intents?: Partial<Record<string, number>>; // tagged messages, last 30 days
  lastSeenAt?: string | null;
};

const DAY = 864e5;
const within = (iso, days) => Boolean(iso) && Date.parse(iso) > Date.now() - days * DAY;
const money = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function leadScore(f: LeadFeatures) {
  const parts: [number, string][] = []; // points, and why
  const add = (points, why) => points && parts.push([points, why]);

  // Fit, up to 40.
  const spent = f.spent || 0;
  const orders = f.orders || 0;
  if (spent) add(Math.min(25, spent / 20), `Spent ${money(spent)} over ${plural(orders, "order")}`);
  if (orders >= 2) add(orders >= 5 ? 15 : 10, orders >= 5 ? "Orders often" : "Ordered more than once");
  if (f.subscriptions) add(10, f.subscriptions > 1 ? `${f.subscriptions} subscriptions` : "Subscribes");
  if (f.wholesale) add(10, "Wholesale account");
  if (f.overdue) add(-10, f.overdue > 1 ? `${f.overdue} invoices overdue` : "Invoice overdue");
  const fit = Math.max(0, Math.min(40, parts.reduce((n, [p]) => n + p, 0)));

  // Engagement, up to 60.
  const before = parts.length;
  const minutes = Math.round((f.seconds || 0) / 60);
  if (f.views) add(Math.min(10, f.views) + Math.min(10, minutes / 3), `Viewed ${plural(f.views, "page")} this month${minutes ? ` (${minutes} min)` : ""}`);
  if (f.cartAdds) add(Math.min(10, f.cartAdds * 3), `Added to cart ${plural(f.cartAdds, "time")}`);
  if (f.messages) add(Math.min(8, f.messages * 2), `${plural(f.messages, "message")} this month`);
  if (f.replyMinutes != null && f.replyMinutes <= 60) add(5, "Replies within the hour");
  const i = f.intents || {};
  if (i.ready) add(12, "Ready to order");
  if (i.pricing) add(5, "Asked about pricing");
  if (i.question) add(3, "Asked about products");
  if (i.complaint) add(-8, "Complained recently");
  if (i.leaving) add(-12, "Sounds like they may leave");
  if (within(f.lastOrderAt, 30)) add(5, "Ordered this month");
  else if (within(f.lastSeenAt, 7)) add(3, "Signed in this week");
  const engagement = Math.max(0, Math.min(60, parts.slice(before).reduce((n, [p]) => n + p, 0)));

  const score = Math.round(fit + engagement);
  // The strongest reasons first, a warning always shown.
  const reasons = [...parts.filter(([p]) => p < 0), ...parts.filter(([p]) => p > 0).sort((a, b) => b[0] - a[0])].slice(0, 3).map(([, why]) => why);
  return { score, level: score >= 60 ? "High" : score >= 30 ? "Medium" : "Low", reasons };
}
