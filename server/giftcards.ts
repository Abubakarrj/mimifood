import { randomBytes } from "node:crypto";

// Gift cards sold on the site: each one Square issued (its ID and number), what it was for and who
// it went to, so the back office can see them and email one again. Balances live in Square.
//
// Stored with server/storage.js as storage.open("giftcards", GIFT_CARD_PARTS).

export const GIFT_CARD_PARTS = {
  cards: (c) => c.id, // { id (Square's), gan, amount, order, toName, toEmail, toPhone?, fromName, message, token, createdAt, emailedAt, textedAt?, acceptedAt?, userId? }
};

// "7783 3200 0000 0000": the number grouped in fours, as it's printed and typed.
export const formatGan = (gan) => String(gan || "").replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
// What a customer typed, as Square's number (digits only).
export const cleanGan = (typed) => String(typed || "").replace(/[\s-]/g, "");

export function createGiftCards({ store }) {
  const db = store.data;
  const save = () => store.save();
  return {
    async add(card) {
      if (!db.cards.some((c) => c.id === card.id)) {
        // token: the recipient's link (/gift/<token>), where they accept it and see its number.
        db.cards.push({ ...card, token: randomBytes(12).toString("base64url"), createdAt: new Date().toISOString(), emailedAt: null });
        await save();
      }
    },
    async emailed(id) {
      const c = db.cards.find((x) => x.id === id);
      if (c) {
        c.emailedAt = new Date().toISOString();
        await save();
      }
    },
    async texted(id) {
      const c = db.cards.find((x) => x.id === id);
      if (c) {
        c.textedAt = new Date().toISOString();
        await save();
      }
    },
    // The card's link token (made for cards from before links).
    async tokenOf(id) {
      const c = db.cards.find((x) => x.id === id);
      if (c && !c.token) {
        c.token = randomBytes(12).toString("base64url");
        await save();
      }
      return c?.token || null;
    },
    byToken: (token) => (token ? db.cards.find((c) => c.token === token) || null : null),
    async accepted(id) {
      const c = db.cards.find((x) => x.id === id);
      if (c && !c.acceptedAt) {
        c.acceptedAt = new Date().toISOString();
        await save();
      }
    },
    // Saved to a shop account (Add to Account on its gift page).
    async setOwner(id, userId) {
      const c = db.cards.find((x) => x.id === id);
      if (c) {
        c.userId = userId;
        await save();
      }
    },
    // An account's cards: saved to it, or sent to its (confirmed) email.
    forUser: (userId, email) => db.cards.filter((c) => c.userId === userId || (email && !c.userId && c.toEmail === email)),
    forEmail: (email) => db.cards.filter((c) => c.toEmail === email),
    get: (id) => db.cards.find((c) => c.id === id) || null,
    forOrder: (number) => db.cards.filter((c) => c.order === number),
    list: () => db.cards.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
