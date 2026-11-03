// Help Docs: the short guides in the help panels: the team's (back office) and the cafés'
// (wholesale portal). Written here to start, then edited in the back office (Configure › Help
// Docs). The cafés' are translated with the rest of the site (server.ts, autoTranslate).
//
// Stored with server/storage.js as storage.open("helpdocs", HELP_PARTS).

import { randomUUID } from "node:crypto";

export const HELP_PARTS = { docs: (d) => d.id };

export class HelpError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const HELP_FOR = ["staff", "cafe"];
const text = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// The guides to start with, from how the pages work.
const STARTERS = [
  ["staff", "Buy", "Tell me how bills work", ["Buy › Bills keeps what suppliers have invoiced us: To Pay first, then Paid.", "New Bill adds one by hand. Import One reads a supplier's invoice (a PDF or photo) and matches it to its purchase order.", "Open a bill to change it. Pay in Square opens the Square Dashboard, where Bill Pay is under Banking; once it's paid there, Mark Paid here."]],
  ["staff", "Buy", "Ordering green coffee", ["Buy › Green Coffee shows what's on hand. Add what you need to the cart, by the bag.", "The cart groups it by supplier and makes a purchase order for each, saved as a draft in Purchase Orders.", "Send a purchase order from it when it's right. When the coffee comes in, mark it received; its supplier's bill goes in Bills."]],
  ["staff", "Buy", "Importing invoices and orders", ["Imports reads what you paste, upload or forward: a café's order becomes a draft wholesale order, a supplier's invoice becomes a bill matched to its purchase order, and an offer sheet lists green coffees.", "Nothing is saved until you check the draft and save it."]],
  ["staff", "Make", "Planning roasts", ["Make › Roasting lays out the week's roasts. Add a roast, pick the coffee and the amount, and assign a roaster.", "Print the roast sheet from the same page. Roast dates go on the bags as lots."]],
  ["staff", "Make", "Counting stock", ["Each product shows a stock bar against its reorder level; Low lists what's under it.", "Restock or Adjust changes a count with a reason, and every change is kept in the stock log with who made it.", "On a phone, Count mode walks the shelf: count, see the differences, then apply them."]],
  ["staff", "Wholesale", "Adding a wholesale account", ["Wholesale › Accounts › New Account sets the café up with its discount and terms.", "Invite sends their login to the portal, where they order at their prices, see invoices and pay."]],
  ["staff", "Wholesale", "Calls with cafés", ["Configure › Calls sets when cafés can book a call from their portal: the days, hours, length and notice, and who takes them.", "Each booked call is a to-do on its day. Cancel one there or in Coming Up, and the café is emailed."]],
  ["staff", "Business", "Adding someone to the team", ["Configure (the gear at the bottom of the sidebar) › Team › Add Member.", "Their role decides which pages they open; you can tick more pages for them. They sign in with a code emailed to them."]],
  ["staff", "Business", "Using to-dos", ["To-Dos keeps what needs doing, with a due date, who it's for, and how often it repeats.", "Link one to an order or account to open it from the to-do. Snooze puts it away until a day you pick."]],
  ["staff", "Business", "Light and dark mode", ["Click Mimi Food at the top of the sidebar and pick Light, Dark or System. It's kept on this device."]],
  ["staff", "Business", "What the assistant can do", ["Skills lists it: looking things up (Report), and drafting changes (Create, Edit, Operate).", "It never changes prices, stock, codes or messages on its own: each change comes back as a proposal with Approve."]],
  ["staff", "Business", "Editing these guides", ["Configure › Help Docs: add a guide, or change or remove one, for the team or for cafés.", "The cafés' guides show in their portal's help panel, in English, Spanish and Korean."]],
  ["cafe", "Ordering", "Placing an order", ["Products lists your prices. Type a quantity beside each size, or use − and +; your order adds up on the right.", "Choose Deliver or Pick Up, add any notes, then Place Order. We email the invoice."]],
  ["cafe", "Ordering", "Your usual order", ["Once an order is built, Save as Usual keeps it.", "Fill Your Usual puts it back in with one click: check it, then place the order."]],
  ["cafe", "Ordering", "Asking for a quote", ["Add what you'd like on Products, then Ask for a Quote.", "We price it and it shows in Orders. Accept it to place the order."]],
  ["cafe", "Ordering", "Reporting a problem with an order", ["Open the order and choose Report a Problem: pick the items, say what happened, and add photos.", "Once we've checked it, the credit comes off your next order."]],
  ["cafe", "Paying", "Paying an invoice", ["Balance lists what's due. Tick what to pay, then pay by card.", "Pay by bank works one invoice at a time, and takes a few business days to clear."]],
  ["cafe", "Account", "Adding your team", ["Account › Team: add someone's email and choose Owner or Buyer.", "A buyer's order over the amount you set needs an owner's OK."]],
  ["cafe", "Account", "Light and dark mode", ["Click your café's name at the top of the sidebar and pick Light, Dark or System."]],
];

export function createHelpDocs({ store }) {
  const db = store.data;
  const save = () => store.save();
  const now = () => new Date().toISOString();

  async function seed() {
    if (db.docs.length) return;
    db.docs = STARTERS.map(([forWho, group, title, body], i) => ({ id: randomUUID(), for: forWho, group, title, body, order: i, createdAt: now() }));
    await save();
  }

  // A guide's text: paragraphs (a blank line between them in the editor).
  function clean(input, was: any = {}) {
    const bodyIn = "body" in input ? input.body : was.body;
    const body = (Array.isArray(bodyIn) ? bodyIn : String(bodyIn ?? "").split(/\n\s*\n/)).map((p) => text(p, 1200)).filter(Boolean).slice(0, 12);
    const d = {
      for: HELP_FOR.includes(input.for) ? input.for : was.for || "staff",
      group: text(input.group ?? was.group, 40) || "General",
      title: text(input.title ?? was.title, 120),
      body,
    };
    if (!d.title) throw new HelpError("Give the guide a title.");
    if (!d.body.length) throw new HelpError("Write what the guide says.");
    return d;
  }

  const list = (forWho = "") => db.docs.filter((d) => !forWho || d.for === forWho).sort((a, b) => a.order - b.order);

  async function add(input) {
    const d = { id: randomUUID(), ...clean(input), order: Math.max(-1, ...db.docs.map((x) => x.order)) + 1, createdAt: now() };
    db.docs.push(d);
    await save();
    return d;
  }
  async function update(id, input) {
    const d = db.docs.find((x) => x.id === id);
    if (!d) throw new HelpError("That guide isn't here any more.", 404);
    Object.assign(d, clean(input, d), { updatedAt: now() });
    await save();
    return d;
  }
  async function remove(id) {
    db.docs = db.docs.filter((x) => x.id !== id);
    await save();
  }

  return { seed, list, add, update, remove };
}
