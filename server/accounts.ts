// Customer accounts and subscriptions (stored by server/storage.js).
//
// Passwords are hashed with scrypt; sessions are random tokens of which only a
// SHA-256 hash is stored. Subscription prices are always computed here from the
// site data, never taken from the browser.

import { scrypt, randomBytes, timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (password: any, salt: any, keylen: number) => Promise<Buffer>;
const SESSION_DAYS = 30;
const FREQUENCY_DAYS = { weekly: 7, biweekly: 14 }; // monthly adds a calendar month

export class AccountError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@,"<>]+@[^\s@,"<>]+\.[^\s@,"<>]{2,}$/;
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
// Today in the shop's time zone (set from createAccounts): an evening in LA isn't tomorrow yet.
let shopZone = "America/Los_Angeles";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: shopZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextAfter(isoDate, freq) {
  if (freq === "monthly") {
    // The same day next month, or its last day when it's shorter (Jan 31 → Feb 28).
    const d = new Date(`${isoDate}T12:00:00Z`);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
    return d.toISOString().slice(0, 10);
  }
  return addDays(isoDate, FREQUENCY_DAYS[freq] || 14);
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [, saltHex, keyHex] = String(stored).split("$");
  if (!saltHex || !keyHex) return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Used to keep failed logins for unknown emails as slow as real ones.
const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"));

// Keys for each list, so storage can save records one by one.
export const ACCOUNT_PARTS = {
  users: (u) => u.id,
  sessions: (s) => s.hash,
  resets: (r) => r.hash,
  verifies: (r) => r.hash,
  subscriptions: (s) => s.id,
};

// `store` comes from storage.open("accounts", ACCOUNT_PARTS).
// takenOver(userId): an account's email owner has taken it over from whoever made it, or reset its
// password; the server removes its passkeys then.
export function createAccounts({ store, subscription, subscriptionCoffee, subscriptionPrice, accessories = [], takenOver = async (_userId) => {}, timeZone = "" }) {
  if (timeZone) shopZone = timeZone;
  const db = store.data;
  const save = store.save;

  // verified: they've shown the email is theirs (a link sent to it), so orders placed with it
  // as a guest are theirs to see.
  // phone: their mobile (E.164); phoneVerified once a code texted to it came back, so it can sign
  // them in. hasPassword: false for an account made with a code (it signs in with codes).
  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, verified: Boolean(u.verified), phone: u.phone || "", phoneVerified: Boolean(u.phoneVerified), hasPassword: Boolean(u.passwordHash) && !u.invited });

  /* ── Users and sessions ── */

  async function register({ name, email, password }) {
    name = String(name || "").trim().slice(0, 80);
    email = String(email || "").trim().toLowerCase();
    password = String(password || "");
    if (!name) throw new AccountError("Please enter your name.");
    if (email.length > 254 || !EMAIL_RE.test(email)) throw new AccountError("Enter a valid email.");
    if (password.length < 8) throw new AccountError("Use at least 8 characters for your password.");
    if (password.length > 200) throw new AccountError("That password is too long.");
    if (db.users.some((u) => u.email === email)) {
      throw new AccountError("This email has an account. Log in instead.", 409);
    }
    const user = { id: randomUUID(), name, email, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
    // Checked again after hashing: two sign-ups at once mustn't make two accounts.
    if (db.users.some((u) => u.email === email)) throw new AccountError("This email has an account. Log in instead.", 409);
    db.users.push(user);
    try {
      await save();
    } catch (error) {
      db.users = db.users.filter((u) => u !== user); // not saved: let them try again
      throw error;
    }
    return publicUser(user);
  }

  async function login({ email, password }) {
    email = String(email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    const ok = await verifyPassword(String(password || ""), user?.passwordHash || DUMMY_HASH);
    if (!user || !ok) throw new AccountError("That email and password don't match.", 401);
    if (user.suspendedAt) throw new AccountError("This account is on hold. Contact us.", 403);
    return publicUser(user);
  }

  /* ── Codes (sign in or up with a code sent by email or text; the server sends and checks them) ── */

  // The account a code just proved: by its email, or by a phone confirmed on it. Null if none.
  function findLogin(via, to) {
    const u = via === "phone" ? db.users.find((x) => x.phoneVerified && x.phone === to) : db.users.find((x) => x.email === String(to || "").trim().toLowerCase());
    return u ? publicUser(u) : null;
  }

  // The email's owner has just proved it (a code or a link to their inbox) on an account that
  // wasn't confirmed: whoever made it may not have been them. So nothing they set up stays: no
  // password, and no one else signed in. Returns true when it was taken over (the caller removes
  // its passkeys too).
  async function claimForOwner(user) {
    if (!user || user.verified) return false;
    user.verified = true;
    delete user.invited; // an invited wholesale login now signs in with codes
    user.passwordHash = await hashPassword(randomBytes(24).toString("hex"));
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
    await save();
    await takenOver(user.id);
    return true;
  }

  // A code to their inbox shows the email is theirs (as the confirmation link does).
  const markEmailVerified = (userId) => claimForOwner(userById(userId));

  // A new account from a code: no password. Its email is confirmed when the code came by email;
  // its phone when the code came by text.
  async function createWithCode({ name, email, phone = "", via }) {
    name = String(name || "").trim().slice(0, 80);
    email = String(email || "").trim().toLowerCase();
    if (!name) throw new AccountError("Please enter your name.");
    if (email.length > 254 || !EMAIL_RE.test(email)) throw new AccountError("Enter a valid email.");
    if (db.users.some((u) => u.email === email)) throw new AccountError("This email has an account. Log in with it, then add your phone in your account.", 409);
    if (phone && db.users.some((u) => u.phoneVerified && u.phone === phone)) throw new AccountError("This number is on another account.", 409);
    const user = { id: randomUUID(), name, email, passwordHash: null, verified: via === "email", ...(phone && { phone, phoneVerified: via === "phone" }), createdAt: new Date().toISOString() };
    db.users.push(user);
    try {
      await save();
    } catch (error) {
      db.users = db.users.filter((u) => u !== user);
      throw error;
    }
    return publicUser(user);
  }

  // Their mobile number: confirmed by a code (then it signs them in), or just kept (from checkout).
  async function setPhone(userId, phone, { verified = false } = {}) {
    const user = userById(userId);
    if (!user) throw new AccountError("Account not found.", 404);
    if (verified && db.users.some((u) => u.id !== userId && u.phoneVerified && u.phone === phone)) throw new AccountError("This number is on another account.", 409);
    if (!verified && user.phoneVerified && user.phone !== phone) return publicUser(user); // a confirmed number stays
    user.phone = phone;
    user.phoneVerified = verified || (user.phoneVerified && user.phone === phone);
    await save();
    return publicUser(user);
  }

  async function createSession(userId) {
    const token = randomBytes(32).toString("base64url");
    const now = Date.now();
    db.sessions = db.sessions.filter((s) => s.expires > now);
    db.sessions.push({ hash: sha256(token), userId, expires: now + SESSION_DAYS * 864e5 });
    const user = db.users.find((u) => u.id === userId);
    if (user) user.lastSeenAt = new Date(now).toISOString();
    await save();
    return { token, maxAge: SESSION_DAYS * 86400 };
  }

  // The login for an email, for a signed link (an invoice) that signs its owner in. Not one that's
  // suspended or still waiting on its invite's password.
  const userIdForEmail = (email) => {
    const u = db.users.find((x) => x.email === String(email || "").trim().toLowerCase());
    return u && !u.suspendedAt && !u.invited ? u.id : null;
  };

  function userFromToken(token) {
    if (!token) return null;
    const hash = sha256(token);
    const session = db.sessions.find((s) => s.hash === hash && s.expires > Date.now());
    const user = session && db.users.find((u) => u.id === session.userId);
    if (!user || user.suspendedAt) return null;
    // Note when they were last here, at most once an hour (for the back office).
    if (!user.lastSeenAt || Date.parse(user.lastSeenAt) < Date.now() - 3600e3) {
      user.lastSeenAt = new Date().toISOString();
      save().catch(() => {});
    }
    return publicUser(user);
  }

  async function destroySession(token) {
    if (!token) return;
    const hash = sha256(token);
    db.sessions = db.sessions.filter((s) => s.hash !== hash);
    await save();
  }

  /* ── Password reset ── */

  const RESET_MINUTES = 60;

  // Returns a one-time token for this email, or null if there's no such account.
  // Only a hash of the token is stored; it expires and works once.
  async function createResetToken(email, minutes = RESET_MINUTES) {
    email = String(email || "").trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (!user || user.suspendedAt) return null;
    const token = randomBytes(32).toString("base64url");
    const now = Date.now();
    db.resets = (db.resets || []).filter((r) => r.expires > now && r.userId !== user.id);
    db.resets.push({ hash: sha256(token), userId: user.id, expires: now + minutes * 60e3 });
    await save();
    return { token, user: publicUser(user), minutes };
  }

  // A link that confirms the email is theirs (sent when they sign up).
  async function createVerifyToken(userId) {
    const user = db.users.find((u) => u.id === userId);
    if (!user || user.verified) return null;
    const token = randomBytes(32).toString("base64url");
    const now = Date.now();
    db.verifies = (db.verifies || []).filter((r) => r.expires > now && r.userId !== user.id);
    db.verifies.push({ hash: sha256(token), userId: user.id, expires: now + 7 * 864e5 });
    await save();
    return token;
  }
  async function verifyEmail(token) {
    const hash = sha256(String(token || ""));
    const v = (db.verifies || []).find((r) => r.hash === hash && r.expires > Date.now());
    const user = v && db.users.find((u) => u.id === v.userId);
    if (!user) return null;
    db.verifies = db.verifies.filter((r) => r.userId !== user.id);
    const claimed = await claimForOwner(user);
    await save();
    return { user: publicUser(user), claimed };
  }

  async function resetPassword(token, password) {
    password = String(password || "");
    if (password.length < 8) throw new AccountError("Use at least 8 characters for your password.");
    if (password.length > 200) throw new AccountError("That password is too long.");
    const hash = sha256(String(token || ""));
    const reset = (db.resets || []).find((r) => r.hash === hash && r.expires > Date.now());
    const user = reset && db.users.find((u) => u.id === reset.userId);
    if (!user) throw new AccountError("This reset link expired. Request a new one.", 400);
    user.passwordHash = await hashPassword(password);
    delete user.invited; // an invited login has now chosen its password
    user.verified = true; // the link came to their inbox
    db.resets = db.resets.filter((r) => r.userId !== user.id);
    db.sessions = db.sessions.filter((s) => s.userId !== user.id); // sign out everywhere
    await save();
    await takenOver(user.id); // and no passkey someone else added still opens it
    return publicUser(user);
  }

  // Wholesale invites: make sure a login exists for this email (with an unusable random
  // password until they choose one through the emailed link).
  async function ensureUser({ name, email }) {
    email = String(email || "").trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) throw new AccountError("That login email doesn't look right.");
    const existing = db.users.find((u) => u.email === email);
    // Still waiting on an invite's password: treat it as new so they get a fresh link (by email).
    if (existing?.invited) return { user: publicUser(existing), created: true, fresh: false };
    // Signed up but never confirmed the email: whoever made it may not own the address, so the
    // email's owner (who's paying with it now) takes it over: a new password by emailed link.
    if (existing && !existing.verified) {
      existing.passwordHash = await hashPassword(randomBytes(24).toString("hex"));
      existing.invited = true;
      db.sessions = db.sessions.filter((x) => x.userId !== existing.id);
      await save();
      await takenOver(existing.id);
      return { user: publicUser(existing), created: true, fresh: false };
    }
    if (existing) return { user: publicUser(existing), created: false, fresh: false };
    const user = { id: randomUUID(), name: String(name || email).trim().slice(0, 80), email, passwordHash: await hashPassword(randomBytes(24).toString("hex")), createdAt: new Date().toISOString(), invited: true };
    if (db.users.some((u) => u.email === email)) return ensureUser({ name, email }); // made meanwhile
    db.users.push(user);
    await save();
    return { user: publicUser(user), created: true, fresh: true };
  }

  /* ── Subscriptions ── */

  const option = (list, id, what) => {
    const found = list.find((x) => x.id === id);
    if (!found) throw new AccountError(`Please choose a valid ${what}.`);
    return found;
  };

  // A rotating choice or one shop coffee ("p:<id>"); see subscriptionCoffee in js/data.js.
  function priced(sub) {
    const cost = subscriptionPrice(subscriptionCoffee(sub.coffee), sub.size);
    if (!cost) throw new AccountError("That coffee or size isn't available for subscriptions any more.");
    return cost.price;
  }

  function view(sub) {
    const label = (list, id) => list.find((x) => x.id === id)?.label || id;
    return {
      id: sub.id,
      coffee: sub.coffee,
      coffeeLabel: subscriptionCoffee(sub.coffee)?.label || sub.coffeeLabel || "Coffee",
      product: subscriptionCoffee(sub.coffee)?.product || null,
      tea: Boolean(subscriptionCoffee(sub.coffee)?.tea),
      grind: sub.grind || "",
      size: sub.size,
      sizeLabel: (subscriptionCoffee(sub.coffee)?.tea && accessories.find((x) => x.id === subscriptionCoffee(sub.coffee).product)?.pack) || label(subscription.sizes, sub.size),
      freq: sub.freq,
      freqLabel: label(subscription.frequencies, sub.freq),
      gift: sub.gift,
      recipient: sub.recipient,
      note: sub.note,
      status: sub.status,
      price: subscriptionPrice(subscriptionCoffee(sub.coffee), sub.size)?.price ?? sub.price ?? 0,
      nextDelivery: sub.status === "active" ? sub.nextDelivery : null,
      createdAt: sub.createdAt,
      lastAction: sub.history?.at(-1)?.action,
      billing: sub.prepaid ? "prepaid" : sub.squareSubscriptionId ? "square" : "invoice",
      ...(sub.prepaid ? { prepaid: { ...sub.prepaid, left: sub.prepaid.deliveries - sub.prepaid.sent } } : {}),
    };
  }

  function cleanDetails(input) {
    const c = subscriptionCoffee(input.coffee);
    if (!c) throw new AccountError("Please choose a valid coffee.");
    const coffee = c.id;
    const size = option(subscription.sizes, input.size, "size").id;
    if (!c.sizes.includes(size)) throw new AccountError(`${c.label} comes in ${c.sizes.join(" or ")}.`);
    const grind = c.grinds ? (c.grinds.includes(input.grind) ? input.grind : c.grinds[0]) : "";
    const freq = option(subscription.frequencies, input.freq, "frequency").id;
    const gift = Boolean(input.gift);
    const recipient = gift ? String(input.recipient || "").trim().slice(0, 80) : "";
    const note = gift ? String(input.note || "").trim().slice(0, 300) : "";
    if (gift && !recipient) throw new AccountError("Add the recipient's name.");
    return { coffee, size, freq, ...(grind ? { grind } : {}), gift, recipient, note, coffeeLabel: c.label };
  }

  function list(userId) {
    const order = { active: 0, paused: 1, ended: 2, cancelled: 3 };
    return db.subscriptions
      .filter((s) => s.userId === userId)
      .sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt))
      .map(view);
  }

  async function create(userId, input, extra: any = {}) {
    const details = cleanDetails(input);
    const now = new Date().toISOString();
    const sub = {
      id: randomUUID(),
      userId,
      ...details,
      squareSubscriptionId: extra.squareSubscriptionId || null,
      squareCustomerId: extra.squareCustomerId || null,
      billedPrice: extra.billedPrice ?? null, // what Square charges each time (kept in step with the shop's price)
      phone: extra.phone || "", // for couriers on local deliveries
      shipTo: extra.shipTo || null,
      status: "active",
      // Prepaid gifts: the first box went with the order, so the next is a month on.
      ...(extra.prepaid ? { prepaid: { deliveries: extra.prepaid, sent: 1, order: extra.order || null } } : {}),
      nextDelivery: extra.prepaid ? nextAfter(today(), "monthly") : addDays(today(), 2), // next roast day, give or take
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, action: "created" }],
    };
    db.subscriptions.push(sub);
    await save();
    return view(sub);
  }

  // `before(sub, action, details)` runs once the change is known to be valid and
  // before it's saved, so the payment provider can be updated first.
  // `staff`: the back office (or a deleted account), which may cancel a prepaid gift.
  async function update(userId, id, input, { before, staff = false }: { before?: any; staff?: boolean } = {}) {
    const sub = db.subscriptions.find((s) => s.id === id && s.userId === userId);
    if (!sub) throw new AccountError("Subscription not found.", 404);
    const action = String(input.action || "");
    const now = new Date().toISOString();
    const soonest = addDays(today(), 2);
    let details = null;
    if (sub.status === "ended") throw new AccountError("This gift subscription has sent all its deliveries.");
    // Paid up front: the coffee, size and number of deliveries are fixed, and a refund for
    // the deliveries not sent goes through the shop.
    if (sub.prepaid && action === "change") throw new AccountError("A prepaid gift can't be changed online. Email us and we'll sort it out.");
    if (sub.prepaid && action === "cancel" && !staff) throw new AccountError("A prepaid gift can't be cancelled online. Email us for a refund of the deliveries not yet sent.");

    if (action === "skip") {
      if (sub.status !== "active") throw new AccountError("Only active subscriptions can skip a delivery.");
    } else if (action === "pause") {
      if (sub.status !== "active") throw new AccountError("This subscription isn't active.");
    } else if (action === "resume") {
      if (sub.status === "active") throw new AccountError("This subscription is already active.");
      if (sub.status === "cancelled" && sub.squareSubscriptionId) {
        throw new AccountError("Cancelled subscriptions can't be restarted. Start a new one from the subscriptions page.");
      }
    } else if (action === "cancel") {
      if (sub.status === "cancelled") throw new AccountError("This subscription is already cancelled.");
    } else if (action === "change") {
      details = cleanDetails({ ...sub, ...input, gift: sub.gift });
    } else {
      throw new AccountError("Unknown change.");
    }

    if (before) await before(sub, action, details, { price: details ? priced(details) : priced(sub) });

    if (action === "skip") sub.nextDelivery = nextAfter(sub.nextDelivery, sub.freq);
    else if (action === "pause") sub.status = "paused";
    else if (action === "resume") {
      sub.status = "active";
      if (!sub.nextDelivery || sub.nextDelivery < soonest) sub.nextDelivery = soonest;
    } else if (action === "cancel") sub.status = "cancelled";
    else if (action === "change") {
      Object.assign(sub, details);
      if (sub.squareSubscriptionId) sub.billedPrice = priced(details);
    }

    sub.updatedAt = now;
    sub.history.push({ at: now, action });
    await save();
    return view(sub);
  }

  /* ── Prepaid gift subscriptions ── */

  // Active prepaid gifts with a delivery due on or before `day` (YYYY-MM-DD).
  function duePrepaid(day) {
    return db.subscriptions
      .filter((s) => s.prepaid && s.status === "active" && s.nextDelivery <= day && s.prepaid.sent < s.prepaid.deliveries)
      .map((s) => {
        const user = db.users.find((u) => u.id === s.userId);
        return { sub: { ...view(s), shipTo: s.shipTo, phone: s.phone }, user: user ? publicUser(user) : null };
      });
  }

  // One more prepaid delivery is going out: count it and set the next date (or end the gift).
  // Saved before the order is made, so a crash can't send the same box twice.
  async function prepaidSent(id) {
    const sub = db.subscriptions.find((s) => s.id === id && s.prepaid);
    if (!sub) return null;
    const now = new Date().toISOString();
    sub.prepaid.sent += 1;
    sub.nextDelivery = nextAfter(sub.nextDelivery > today() ? sub.nextDelivery : today(), sub.freq);
    if (sub.prepaid.sent >= sub.prepaid.deliveries) {
      sub.status = "ended";
      sub.history.push({ at: now, action: "all deliveries sent" });
    }
    sub.updatedAt = now;
    await save();
    return view(sub);
  }

  // Customers with an active subscription (for the subscriber discount).
  const hasActiveSubscription = (userId) => db.subscriptions.some((s) => s.userId === userId && s.status === "active" && !s.prepaid);
  // Square-billed subscriptions still running (active or paused), for moving them to a new price.
  const squareBilled = () => db.subscriptions.filter((s) => s.squareSubscriptionId && !s.prepaid && (s.status === "active" || s.status === "paused"));
  // What a subscription would cost now, at the shop's price (null: no longer sold).
  const priceNow = (sub) => subscriptionPrice(subscriptionCoffee(sub.coffee), sub.size)?.price ?? null;
  async function setBilledPrice(id, price) {
    const sub = db.subscriptions.find((s) => s.id === id);
    if (!sub) return;
    sub.billedPrice = price;
    sub.updatedAt = new Date().toISOString();
    await save();
  }
  // How many subscriptions still bill or send a coffee or tea ("p:<id>", "t:<id>").
  const subscribedTo = (coffee) => db.subscriptions.filter((s) => s.coffee === coffee && s.status !== "cancelled" && s.status !== "ended").length;

  /* ── Square-billed subscriptions ── */

  const bySquareId = (squareId) => db.subscriptions.find((s) => squareId && s.squareSubscriptionId === squareId) || null;

  // A Square invoice for the subscription was paid. The first one pays for the delivery that
  // came with the checkout order, so only later ones are renewals (returned for a new order).
  async function billed(squareId, invoiceId) {
    const sub = bySquareId(squareId);
    if (!sub) return null;
    sub.paidInvoices ||= [];
    if (sub.paidInvoices.includes(invoiceId)) return null; // already handled
    sub.paidInvoices.push(invoiceId);
    const renewal = sub.paidInvoices.length > 1;
    const user = db.users.find((u) => u.id === sub.userId);
    if (renewal) sub.nextDelivery = nextAfter(sub.nextDelivery > today() ? sub.nextDelivery : today(), sub.freq);
    sub.updatedAt = new Date().toISOString();
    await save();
    return renewal ? { sub: { ...view(sub), shipTo: sub.shipTo, phone: sub.phone }, user: user ? publicUser(user) : null } : null;
  }

  // Square ended the subscription (e.g. it was cancelled in the Square dashboard).
  async function endedInSquare(squareId) {
    const sub = bySquareId(squareId);
    if (!sub || sub.status === "cancelled") return null;
    const now = new Date().toISOString();
    sub.status = "cancelled";
    sub.updatedAt = now;
    sub.history.push({ at: now, action: "cancelled in Square" });
    await save();
    return view(sub);
  }

  /* ── Account controls (back office, and customers deleting their own account) ── */

  const userById = (id) => db.users.find((u) => u.id === id) || null;

  async function checkPassword(userId, password) {
    const user = userById(userId);
    if (user && !user.passwordHash) throw new AccountError("This account signs in with codes, so it has no password.", 400);
    if (!user || !(await verifyPassword(String(password || ""), user.passwordHash))) throw new AccountError("That password isn't right.", 401);
  }

  // Staff edit a customer's name or login email.
  async function updateProfile(userId, input) {
    const user = userById(userId);
    if (!user) throw new AccountError("Customer not found.", 404);
    const name = String(input.name ?? user.name).trim().slice(0, 80);
    const email = String(input.email ?? user.email).trim().toLowerCase();
    if (!name) throw new AccountError("Please enter their name.");
    if (email.length > 254 || !EMAIL_RE.test(email)) throw new AccountError("Enter a valid email.");
    if (db.users.some((u) => u.id !== userId && u.email === email)) throw new AccountError("Another account already uses that email.", 409);
    // A new address isn't confirmed yet, and links sent to the old one stop working.
    if (email !== user.email) {
      user.verified = false;
      db.resets = (db.resets || []).filter((r) => r.userId !== user.id);
      db.verifies = (db.verifies || []).filter((r) => r.userId !== user.id);
    }
    Object.assign(user, { name, email, updatedAt: new Date().toISOString() });
    await save();
    return publicUser(user);
  }

  // Suspend: they're signed out and can't log in, and their active subscriptions pause (Square
  // first, through `before`). Unsuspending resumes the ones the suspension paused.
  async function setSuspended(userId, suspended, { before }: { before?: any } = {}) {
    const user = userById(userId);
    if (!user) throw new AccountError("Customer not found.", 404);
    if (Boolean(user.suspendedAt) === Boolean(suspended)) return publicUser(user);
    const subs = db.subscriptions.filter((x) => x.userId === userId);
    if (suspended) {
      for (const sub of subs.filter((x) => x.status === "active")) {
        await update(userId, sub.id, { action: "pause" }, { before });
        sub.pausedBySuspension = true;
      }
      user.suspendedAt = new Date().toISOString();
      db.sessions = db.sessions.filter((x) => x.userId !== userId);
      db.resets = (db.resets || []).filter((x) => x.userId !== userId);
    } else {
      for (const sub of subs.filter((x) => x.pausedBySuspension && x.status === "paused")) {
        await update(userId, sub.id, { action: "resume" }, { before });
        delete sub.pausedBySuspension;
      }
      delete user.suspendedAt;
    }
    await save();
    return publicUser(user);
  }

  // Delete: subscriptions are cancelled (Square first), then the login, sessions and saved
  // subscriptions are removed. Returns the email, so orders and the newsletter can be cleared too.
  async function deleteUser(userId, { before }: { before?: any } = {}) {
    const user = userById(userId);
    if (!user) throw new AccountError("Customer not found.", 404);
    for (const sub of db.subscriptions.filter((x) => x.userId === userId && x.status !== "cancelled" && x.status !== "ended")) {
      await update(userId, sub.id, { action: "cancel" }, { before, staff: true });
    }
    db.subscriptions = db.subscriptions.filter((x) => x.userId !== userId);
    db.sessions = db.sessions.filter((x) => x.userId !== userId);
    db.resets = (db.resets || []).filter((x) => x.userId !== userId);
    db.users = db.users.filter((u) => u !== user);
    await save();
    return { email: user.email, name: user.name };
  }

  // One customer in full, for the back office drawer.
  function customer(userId) {
    const user = userById(userId);
    if (!user) return null;
    return { ...publicUser(user), createdAt: user.createdAt, lastSeenAt: user.lastSeenAt || user.createdAt, suspendedAt: user.suspendedAt || null, subscriptions: list(userId) };
  }

  // Everyone with an account, for the back office.
  function customers() {
    return db.users.map((u) => {
      const subs = db.subscriptions.filter((s) => s.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        createdAt: u.createdAt,
        // Theirs: confirmed by a code or link, or by phone (a wholesale login), not just invited.
        confirmed: Boolean((u.verified || u.phoneVerified) && !u.invited),
        suspendedAt: u.suspendedAt || null,
        lastSeenAt: u.lastSeenAt || u.createdAt,
        subscriptions: { active: subs.filter((s) => s.status === "active").length, paused: subs.filter((s) => s.status === "paused").length, total: subs.length },
      };
    });
  }

  const ownerOf = (id) => db.subscriptions.find((s) => s.id === id)?.userId || null;

  function exportRows() {
    const users = Object.fromEntries(db.users.map((u) => [u.id, u]));
    return db.subscriptions.map((s) => ({
      ...view(s),
      shipTo: s.shipTo,
      nextDelivery: s.nextDelivery,
      customerName: users[s.userId]?.name || "",
      customerEmail: users[s.userId]?.email || "",
      updatedAt: s.updatedAt,
      lastChange: s.history.at(-1)?.action || "",
      history: s.history.slice(-10),
    }));
  }

  return {
    register,
    login,
    createSession,
    findLogin,
    markEmailVerified,
    createWithCode,
    setPhone,
    userIdForEmail,
    userFromToken,
    destroySession,
    createResetToken,
    createVerifyToken,
    verifyEmail,
    resetPassword,
    ensureUser,
    list,
    create,
    update,
    billed,
    endedInSquare,
    duePrepaid,
    prepaidSent,
    hasActiveSubscription,
    subscribedTo,
    squareBilled,
    priceNow,
    setBilledPrice,
    ownerOf,
    customers,
    customer,
    checkPassword,
    updateProfile,
    setSuspended,
    deleteUser,
    exportRows,
  };
}
