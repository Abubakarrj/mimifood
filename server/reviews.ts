// Product reviews from customers who bought the product: the email after an order links to
// /review, which only opens for that order (a signed link), one review per product per order.
// Published straight away; the back office can hide one. Product pages (and Google) show the
// stars only once there are real reviews.
//
// Stored with server/storage.js as storage.open("reviews", REVIEW_PARTS).

export class ReviewError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const REVIEW_PARTS = { reviews: (r) => r.id };

// "Casey Morgan" → "Casey M."
const shortName = (name) => {
  const [first, ...rest] = String(name || "").trim().split(/\s+/);
  const last = rest.at(-1);
  return first ? `${first}${last ? ` ${last[0].toUpperCase()}.` : ""}` : "A customer";
};

export function createReviews({ store }) {
  const db = store.data;
  const save = () => store.save();
  const live = (productId) => db.reviews.filter((r) => r.product === productId && r.status === "published");

  return {
    // What the order's buyer wrote, by product (for the review page).
    forOrder: (number) => Object.fromEntries(db.reviews.filter((r) => r.order === number).map((r) => [r.product, { rating: r.rating, text: r.text }])),

    async submit({ order, product, name, rating, text }) {
      const stars = Math.round(Number(rating));
      if (!(stars >= 1 && stars <= 5)) throw new ReviewError("Choose from 1 to 5 stars.");
      const body = String(text || "").replace(/\s+/g, " ").trim().slice(0, 1000);
      const id = `${order}:${product}`;
      const now = new Date().toISOString();
      const had = db.reviews.find((r) => r.id === id);
      if (had) Object.assign(had, { rating: stars, text: body, updatedAt: now });
      else db.reviews.push({ id, order, product, name: shortName(name), rating: stars, text: body, status: "published", createdAt: now });
      await save();
      return db.reviews.find((r) => r.id === id);
    },

    // Newest first; `limit` for the product page.
    forProduct: (productId, limit = 20) =>
      live(productId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(({ name, rating, text, createdAt }) => ({ name, rating, text, createdAt })),

    summary(productId) {
      const list = live(productId);
      return list.length ? { count: list.length, average: Math.round((list.reduce((n, r) => n + r.rating, 0) / list.length) * 10) / 10 } : null;
    },

    list: () => [...db.reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

    async setStatus(id, status) {
      const r = db.reviews.find((x) => x.id === id);
      if (!r) throw new ReviewError("Review not found.", 404);
      if (!["published", "hidden"].includes(status)) throw new ReviewError("Unknown status.");
      r.status = status;
      await save();
      return r;
    },
  };
}
