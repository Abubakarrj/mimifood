// Passkeys (Face ID, Touch ID, Windows Hello, a phone or a security key): log in without a
// password or a code. A logged-in customer adds one; afterwards the login page signs them in
// with it. The device keeps the private key; we keep its public key and a use counter.

import { randomBytes } from "node:crypto";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";

export class PasskeyError extends Error {
  declare status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const PASSKEY_PARTS = { keys: (x: any) => x.id };
const CHALLENGE_MS = 5 * 60_000;

type Key = { id: string; userId: string; publicKey: string; counter: number; transports: string[]; device: string; createdAt: string; lastUsedAt: string | null };

export function createPasskeys({ store, siteUrl, siteName }: { store: any; siteUrl: string; siteName: string }) {
  const db = store.data;
  db.keys ||= [];
  const keys: Key[] = db.keys;
  const origin = new URL(siteUrl).origin;
  const rpID = new URL(siteUrl).hostname;
  // Each challenge is used once, within five minutes.
  const challenges = new Map<string, { challenge: string; userId?: string; expires: number }>();
  const hold = (key: string, challenge: string, userId?: string) => {
    for (const [k, c] of challenges) if (c.expires < Date.now()) challenges.delete(k);
    challenges.set(key, { challenge, userId, expires: Date.now() + CHALLENGE_MS });
  };
  const take = (key: string) => {
    const c = challenges.get(key);
    challenges.delete(key);
    if (!c || c.expires < Date.now()) throw new PasskeyError("That took too long. Try again.");
    return c;
  };

  const forUser = (userId: string) => keys.filter((k) => k.userId === userId);
  const view = (k: Key) => ({ id: k.id, device: k.device, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt });

  async function registerOptions(user: { id: string; email: string; name?: string }) {
    const options = await generateRegistrationOptions({
      rpName: siteName,
      rpID,
      userName: user.email,
      userDisplayName: user.name || user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: forUser(user.id).map((k) => ({ id: k.id, transports: k.transports as any })),
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    });
    hold(`reg:${user.id}`, options.challenge, user.id);
    return options;
  }

  async function register(user: { id: string }, response: any, device = "") {
    const { challenge } = take(`reg:${user.id}`);
    let result;
    try {
      result = await verifyRegistrationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID });
    } catch (error) {
      console.error("[passkeys] register:", error.message);
      throw new PasskeyError("Couldn't add that passkey. Try again.");
    }
    if (!result.verified || !result.registrationInfo) throw new PasskeyError("Couldn't add that passkey. Try again.");
    const c = result.registrationInfo.credential;
    if (keys.some((k) => k.id === c.id)) throw new PasskeyError("That passkey is already added.");
    const key: Key = { id: c.id, userId: user.id, publicKey: Buffer.from(c.publicKey).toString("base64url"), counter: c.counter, transports: c.transports || [], device: String(device || "Passkey").slice(0, 60), createdAt: new Date().toISOString(), lastUsedAt: null };
    keys.push(key);
    await store.save();
    return view(key);
  }

  // Login: the device offers whichever passkey it has for this site, so nothing is typed first.
  async function loginOptions() {
    const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
    const ticket = randomBytes(16).toString("base64url");
    hold(`login:${ticket}`, options.challenge);
    return { options, ticket };
  }

  // The user id the passkey belongs to, once its signature checks out.
  async function login(ticket: string, response: any) {
    const { challenge } = take(`login:${String(ticket || "")}`);
    const key = keys.find((k) => k.id === response?.id);
    if (!key) throw new PasskeyError("That passkey isn't on any account here. Log in another way, then add it.", 404);
    let result;
    try {
      result = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: { id: key.id, publicKey: Buffer.from(key.publicKey, "base64url"), counter: key.counter, transports: key.transports as any },
      });
    } catch (error) {
      console.error("[passkeys] login:", error.message);
      throw new PasskeyError("Couldn't log in with that passkey. Try again.", 401);
    }
    if (!result.verified) throw new PasskeyError("Couldn't log in with that passkey. Try again.", 401);
    key.counter = result.authenticationInfo.newCounter;
    key.lastUsedAt = new Date().toISOString();
    await store.save();
    return key.userId;
  }

  async function remove(userId: string, id: string) {
    const i = keys.findIndex((k) => k.userId === userId && k.id === id);
    if (i < 0) throw new PasskeyError("Passkey not found.", 404);
    keys.splice(i, 1);
    await store.save();
  }

  // Every passkey on an account (its email's owner has just taken it over from whoever made it).
  async function removeAll(userId: string) {
    let gone = 0;
    for (let i = keys.length - 1; i >= 0; i--) if (keys[i].userId === userId) keys.splice(i, 1), gone++;
    if (gone) await store.save();
  }

  return { registerOptions, register, loginOptions, login, remove, removeAll, list: (userId: string) => forUser(userId).map(view) };
}
