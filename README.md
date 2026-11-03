# Mimi Food

Website for Mimi Food, a Los Angeles specialty coffee roaster and tea company.
Plain HTML/CSS/JS, served by a small Node server written in TypeScript (`server.ts`, run directly by Node 22.18+). The browser scripts are TypeScript too (`js/*.ts`), sent to browsers as JavaScript at their `.js` addresses. `npm run typecheck` checks the types that also powers the AI answers on the FAQ page.

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start   # http://localhost:3000
```

Opening the HTML files directly still works for everything except the AI question box.

## Pages

| Page | What it does |
| --- | --- |
| `./` | Hero video (grey placeholder until `assets/hero.mp4` is added), ticker, coffee grid with filters and quick add |
| `product?id=…` | Coffee details, size and grind options, add to cart |
| `subscriptions` | Build a subscription (coffee, bags, frequency) with live price |
| `order-ahead` | Pick a location and time, add café drinks for pickup |
| `locations` | Outlets with live open/closed status, hours, directions |
| `order-ahead` → `order` | Order Ahead (cafés only; `cafe: false` keeps a location off it): choose a café, then straight to the menu. Café, Pickup/Delivery and Time sit above the menu; the time defaults to ASAP while the café is open (the server sets the time when the order is placed), otherwise the next 10-minute window. Delivery fee, minimum and lead time in `SITE.cafeDelivery`. After paying: "See you soon" with when it's ready, the café with Directions, the items and what to do on arrival; marking it Ready in the back office emails the customer |
| `login` / `reset` / `account` | Customer log in / sign up / password reset; manage subscriptions (skip, pause, resume, change, cancel) |
| `wholesale` | Wholesale offer, how it works, enquiry form (saved, emailed to `wholesaleEmail`; export at `/admin/wholesale.csv?key=ADMIN_KEY`) |
| `trade` | Wholesale portal: a café or shop with a wholesale account logs in to order at its own prices (1kg or 250g, grind per coffee, delivery or pickup, their PO number), see orders and invoices, reorder, and update delivery details |
| `privacy` | Privacy & Cookie Policy: what's collected, who it's shared with, how to delete it, and the cookies, with a button to change the cookie choice (`cookies.html` redirects here) |
| `faq` | Common questions, then an "Ask your own question" row; asked questions are added to the list with AI answers |
| `contact` | Contact details and form |
| `checkout` | Order summary, delivery or pickup, place order |

The header, full-screen menu, cart drawer and footer are added to every page by `js/app.js`.

## Editing content

Coffees are managed in the back office (**Products**, below). Everything else lives in
**`js/data.js`**: contact emails, subscription options, locations and opening hours, café menu and
FAQ. All current values are placeholders. The coffees in `js/data.js` are only the starting list,
copied into the database on the first run.

**Roasts and grinds.** We roast light, for filter or for espresso, and that's each coffee's roast
type. A coffee sells as whole beans, or ground for the way it's roasted to be brewed (filter roasts
for filter, espresso roasts for espresso), never another grind; a coffee can also be whole bean
only. The rule is `grindsFor` in `js/data.js`, and checkout, the wholesale portal and the back office
all enforce it.

Media in `assets/`: `hero.mp4` plays muted and looping in the home page hero (it stays a grey box
until then), and optional location photos named after each location's id (`roastery.jpg`,
`central.jpg`, `park.jpg`).

## AI answers on the FAQ page

Visitors can type their own question. `POST /api/ask` in `server.ts` sends it to Claude
(low effort for quick replies) along with everything in `js/data.js`, so answers
come from your real coffees, prices, hours and policies. Edit `js/data.js` and restart; the assistant
knows the change. It says so when it doesn't know something and points people to your email.

- The API key stays on the server (`ANTHROPIC_API_KEY`); it is never sent to the browser.
- Each visitor can ask 12 questions per 10 minutes; questions are capped at 600 characters.
- Two models, to keep costs down: short everyday questions and the coffee finder go to the quick,
  cheap model (`QUICK_MODEL`, `claude-haiku-5-5`). Questions about an order going wrong (refunds,
  damage, cancellations, allergies), long questions and longer conversations go to the stronger
  model (`MODEL`, `claude-opus-5-5`), as does anything the quick model declines or fails on. The
  logs show which model answered (`[ask] claude-haiku-5-5: …`). Translations stay on `MODEL`.
- If a request is declined by Claude's safety filters, it is retried on Anthropic's recommended
  fallback model; if that also declines, the visitor sees a polite message.
- Without a key the box shows "not set up yet"; the rest of the site works normally.

## Orders and payments (Square)

The site and back office are where everything is done; Square runs behind them. The cart is saved
in the visitor's browser. At checkout the server prices every line from the live catalogue (the
browser's prices are never trusted), saves the order and emails the customer and `ordersEmail`
(when Resend is set up).

**Wholesale bank payments with Stripe** (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` and
`STRIPE_WEBHOOK_SECRET` set; webhook `https://<your-site>/api/stripe/webhook` with the events
`payment_intent.processing`, `payment_intent.succeeded` and `payment_intent.payment_failed`):
the portal's **Pay by Bank** is its own form (name, routing and account numbers, checking or
savings). The numbers go from the café's browser to Stripe, never through the server. The first
time, Stripe sends a 1¢ deposit and the café enters the code from their statement (SM…) in the
portal; then the payment processes (a few business days) and their bank is saved, so later
invoices are one tap. When it clears, the invoices are paid and recorded on their Square orders
as bank transfers, so the Square invoices show paid too. Without the keys, Pay by Bank goes
through Square (one invoice at a time) as before.

**With Square** (`SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID` and
`SQUARE_WEBHOOK_SIGNATURE_KEY` set), checkout has two steps on the site: the customer's details,
then Square's card form (card, plus Apple Pay and Google Pay where the device has them). Card
details go straight to Square. Each paid order becomes a Square order, so it shows in Square POS
and the Order Manager and prints at the bar:

- **Coffee bags** ship (the cheapest carrier through Shippo, label bought when paid), or are
  collected at Roastery House. An address **within 10 miles** of Roastery House (327 S Western Ave)
  can go by **courier** (Uber Direct): as soon as the address is filled in, checkout shows
  **Local delivery** with the courier's own quoted fee next to **Standard shipping**, and the
  customer picks one. Local delivery charges that fee as the delivery fee (Square gets it as the
  order's delivery charge). It's **Free** whenever the order would ship free (over the threshold,
  a free-shipping code); the shop pays the courier. `SITE.localDelivery.maxFee` caps what the
  customer pays and asks for a phone number for the courier. If the fee has moved by the time the order
  is placed, checkout shows the new one and asks again. The courier is booked when the order is marked
  **Packed** (or with **Book courier** on the order).
- **Café orders** (Order Ahead) go to the chosen bar's Square location (`squareLocationId` on each
  location in `js/data.js`, else `SQUARE_LOCATION_ID`) as a scheduled pickup. Café delivery books
  its courier as soon as it's paid, for the time the order will be ready.
- **Subscriptions** save the card to the customer in Square and start a Square subscription (plans
  are created in Square's catalogue as needed). Square bills each period; every paid renewal after
  the first becomes an order to pack. Subscriptions ship free. Skip, pause, resume, change and
  cancel in `account` and the back office update Square too.
- **Refunds** are made from the order in the back office (through Square); refunds made in Square
  show up on the order too.
- **Wholesale** orders are invoiced with Square Invoices (emailed by Square, due on the account's
  terms) and marked paid when the invoice is paid.
- **Suppliers** (Purchasing → Suppliers) are Square vendors too: each change is sent (found by
  name the first time, so there's no second one), and archiving or deleting one makes it inactive
  there. A product's supplier and our cost per 250g and 1kg (on its page, under Pricing) go on its
  variations in Square's item library, so Square's reports show the vendor and cost.
- **Products and the café menu** edited in the back office are pushed to Square's item library
  (names, prices including sale labels, sold out, hidden, photos), so the POS matches the site.
  If Square can't be reached the change is saved here and the push is retried on the next save.

Set up Square (sandbox first, `SQUARE_ENVIRONMENT=sandbox`):

1. developer.squareup.com → your application → Credentials: copy the access token and the
   application ID. Locations: copy the main location ID (and each bar's, into `js/data.js`).
2. Webhooks → Add subscription: URL `https://<your-site>/api/square/webhook`, events
   `invoice.payment_made`, `refund.created`, `refund.updated`, `subscription.updated` and
   `payment.updated`. Copy its signature key into `SQUARE_WEBHOOK_SIGNATURE_KEY`. If the site's
   public address differs from `SITE_URL`, set `SQUARE_WEBHOOK_URL` to the exact URL.
3. For Apple Pay, register your domain with Square (Developer Console → your app → Apple Pay):
   download the domain association file, save it as
   `apple-pay/apple-developer-merchantid-domain-association` (it's served at
   `/.well-known/apple-developer-merchantid-domain-association`), deploy, then press Verify.
   Express checkout: on a device with Apple Pay (iPhone, iPad, Mac), a black "Check out with
   Apple Pay" button sits at the top of checkout; on Android with Google Pay, Google's button
   (never both: Square only makes an Apple Pay button where Apple Pay is set up, and Google Pay
   is offered on Android only). The wallet's sheet collects name, email, phone and address, and
   offers delivery or pickup at Roastery House; the order is then placed and priced by the server
   like any other (courier or post by the address) and paid with the wallet's token, only if
   the total matches what the sheet showed. Carts with a subscription, a gift sent to someone
   else, or café items use the form.
4. `currencyCode` in `js/data.js` is `USD`.

Going live (sandbox to production):

1. Developer Console → your app → Credentials, with Production chosen: copy the production access
   token and application ID (`sq0idp-…`); Locations: the production location ID (and each bar's
   in `js/data.js`). In Render, set those three and `SQUARE_ENVIRONMENT=production`.
2. Webhooks, with Production chosen: add the same subscription again (sandbox subscriptions
   don't carry over) and put its signature key in `SQUARE_WEBHOOK_SIGNATURE_KEY`.
3. Apple Pay, with Production chosen: add the domain, download its domain association file,
   replace `apple-pay/apple-developer-merchantid-domain-association` with it, deploy, then Verify.
4. On its first start in production the server drops the sandbox's ids (subscription plans,
   wholesale customers and their saved cards, the item library's ids) and pushes the products
   and café menu to the production item library. Orders paid in the sandbox keep their records;
   refund those in the sandbox dashboard if needed. Subscriptions started in the sandbox aren't
   billed in production: cancel them in the back office.

**Careers.** Roles are written in Back office → Careers (title, team, type, where, pay, a
one-line summary and the description: `## ` for a heading, `- ` for a list). A role is a draft until
it's opened; open roles are at /careers and /careers/<role> (with a JobPosting for Google's job
search, and in the sitemap), and a Careers link shows in the footer. Applications (name, email,
phone, a link, a PDF or Word CV up to 5 MB, a note) land in Back office → Careers → Applications;
the team is emailed and the applicant gets a confirmation. Closing a role keeps its applications. Careers → Page sets the page's heading, a few lines about working here, and the perks (a name and a
line each), shown on /careers and every role's page. Roles are listed by team; the part of a title
after its first comma shows muted ("Art Director, Editorial Photography and Motion").

**Hiding orders.** Tick orders in a list (or open one → More actions) and **Hide**: they leave
every order list and count, and the overview's To Pack, but nothing is cancelled, refunded or
emailed, and sales figures still count them. Orders → **Hidden** lists them, with **Unhide**.

**Bulk Edit.** Products → Bulk Edit is every coffee and tea in one grid: prices (250g or pack,
1kg), costs, shown, sold out and stock left. Changed cells are marked; **Save** applies them all at
once, each checked first (one that isn't right stops them all), and Square is updated as for a
single save. **Export CSV** downloads the same columns (`/admin/products.csv`); **Import CSV**
reads one back into the grid, matched by id, to check before saving (new products are added in
Products, not by import).

**Editing an order.** An order still to pack (no label, no courier booked) has **Edit Items**:
change a coffee's or accessory's quantity (0 takes it off) or add one from the shop. Lines that
stay keep what was paid; added ones are at today's price; delivery stays as charged; tax is what
was charged moved by the tax on what changed. A preview shows the new total and what happens to
the money before saving. Less to pay: the difference is refunded to the card through Square (paid
another way, the order says to refund it yourself). More: the customer is emailed a Square invoice
for the difference (the order shows it until it's paid; it can't be edited again meanwhile).
Wholesale orders (unpaid) are priced again at the account's prices and re-invoiced. Stock moves
with the change, and the customer is emailed what their order is now. An order whose total was
changed some other way (in Square) can't be edited here.

**Back office look.** The back office looks like Medusa's admin (`admin-medusa.css`, over the
theme in `admin.css`): Medusa's colors, Inter, 13px text, 32px controls, bordered cards, table rows
with hairlines, status chips, a light sidebar; phones keep 40px controls and 16px fields. Icons are
Lucide in thin 1.5px outlines, picked to match Peasy's where we have the same thing. Only the main action on a screen is dark. Statuses are tinted chips in one color each (Medusa's tag colors plus
amber): to pack orange, packed and ready blue, shipped purple, completed and paid green, unpaid red,
awaiting payment and paused yellow; grades A green to F red. The overview's sales chart stacks
each day by channel (online store blue, wholesale orange, café green, subscriptions purple, point
of sale amber; `--chart-1…5` in admin.css, checked as a set for color-blind readers), with a
legend of each channel's total and a tooltip per day. `/admin?look=classic` shows the earlier look in that browser;
`/admin?look=medusa` goes back.

**Team and activity.** Back office → Team (owners): add someone with their name, work email and
role, and they're emailed how to sign in: their email, then a code emailed to it (10 minutes, five
tries). Roles: **Owner** (every page, and the team), **Manager** (every page but the team),
**Fulfillment** (Overview, Orders, Returns, Inbox, Customers) and **Café** (Orders, Café menu,
Inbox). The server checks each request against the role (`server/staff.ts` canCall), not just the
menu, and exports follow the same pages. Turning someone off or removing them signs them out
everywhere; the team always keeps an owner. `ADMIN_KEY` still signs in, as the owner. Team →
Activity (owners and managers) lists every change made in the back office, newest first, with
who made it, kept 180 days.

**Grading applicants.** Each application is read by the assistant (the quick model) against its
role: what they wrote, their links as given (not opened) and their CV (a PDF as is, a .docx as
text; never their name, email or phone). It grades A, B, C, D or F with a line and
up to three strengths and concerns, shown on the application. A grade the team picks wins over
it; Applications filters by grade. Grading runs as an application arrives, and every 15 minutes
for any that failed (three tries); **Grade Again** re-reads one (after the role changes, say).
About a tenth of a cent each. Nothing is declined or emailed by it: a person decides. Using an
automated tool to screen applicants falls under California's rules on automated decision systems
in hiring, so keep these grades with the application records and review them for fairness.

**Couriers (Uber Direct).** Set `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID` and
`UBER_DIRECT_CLIENT_SECRET` (Uber Direct dashboard → Developer), and add a webhook to
`https://<your-site>/api/uber/webhook` with its signing key in `UBER_DIRECT_WEBHOOK_SECRET`.
Checkout quotes the address and shows "Local Delivery · Uber Direct" with its fee and arrival
time; the courier is booked when the order is packed (café deliveries when paid). Each location
needs a `phone` in `js/data.js` for the courier. The order follows the courier: picked up →
shipped (the customer gets an email with the tracking link), dropped off → completed. Without
Uber Direct set up, local deliveries are flagged in the back office and emailed to the shop to
book by hand. Gifts sent to a nearby recipient and subscription renewals go by courier too.

**Shipping (Shippo).** Set `SHIPPO_API_TOKEN`. Once the address is in, checkout shows the cheapest
rate from every carrier on the Shippo account (no Media Mail, nothing slower than
`SITE.postage.maxDays`) with the carrier's delivery estimate, and charges exactly that. When the
order is paid, that label is bought automatically and waits in the back office to print (turn
this off with `SITE.postage.autoLabels: false`). A `shippo_test_` token buys free test labels.
For tracking, add a Shippo webhook for **track_updated** to
`https://<your-site>/api/shippo/webhook?token=<SHIPPO_WEBHOOK_SECRET>`.

**Sales tax.** California orders (a CA delivery address, or pickup) pay sales tax on taxable
items only: accessories and café food and drinks (`SITE.salesTax.taxable`). Coffee beans,
subscriptions, class seats and shipping or delivery charges aren't taxed. The rate is the
address's own, from the CDTFA's free tax rate lookup (no key), with `SITE.salesTax.defaultRate`
(Roastery House's) if it can't be reached. Checkout shows a Tax line; each order sends its tax to
Square as a real tax on those lines, so it lands in Square's sales tax reports.

**Other states.** Back office → Sales tax shows sales and orders by state for this year and last
against each state's threshold (`server/nexus.js`; a guide, check with each state). The shop is
emailed when a state reaches 80% and when it's passed. Once registered there, turn the state on:
from then on orders sent there are taxed per item class (coffee as groceries, the tee as
clothing, other accessories as general goods), at rates from OpenSalesTax (`OPENSALESTAX_URL`,
self-hosted, optional `OPENSALESTAX_API_KEY`) or the rates entered when turning it on.

**Order tracking.** Every order has its own page, `track?order=…&t=…`, linked from each
order email and from "Track order" on the account page. It shows our own steps (ordered,
packed, on its way, delivered) with times, the courier's first name and arrival time, or a
parcel's latest scan and expected day, without courier or carrier branding. Customers are
emailed when it's on its way, out for delivery (parcels) and delivered.
Without Shippo (or `USPS_CLIENT_ID`/`USPS_CLIENT_SECRET` for USPS prices alone), shipping is
`SITE.shippingFlat`.

**Without Square**, the order is saved and you arrange payment by email. If the site runs without
the server (a static host), checkout falls back to opening an email with the order.

## Directions and the café delivery area (OpenStreetMap)

No maps are drawn on the site. "Find the nearest shop" and the delivery areas use OpenStreetMap's
address lookup, with no API keys. Directions links open Google Maps (no key needed for links), which
goes straight to the Google Maps app on phones.

- **Shop locations:** with real addresses in `LOCATIONS` (`js/data.js`), the server looks up each
  shop's coordinates on start-up. Placeholder addresses containing "Example" are skipped. To pin a
  shop exactly, set its `coords: [latitude, longitude]`.
- **Locations page:** each shop's hours, a Directions link (Google Maps) and Order Ahead.
- **Order Ahead:** "Find the nearest shop" sorts the shops by distance from the customer.
- **Café delivery:** when a customer enters a delivery address, it's checked against
  `cafeDelivery.radiusKm` from the chosen bar. Outside the area, the sheet suggests a bar that does
  deliver there, or pickup. Checkout enforces the same rule, and the back office shows the distance.
  If an address can't be found, the order goes through and the shop confirms it.
- Address lookups use [Nominatim](https://nominatim.org) within its usage policy: one request per
  second at most, results cached for 30 days, and no search-as-you-type. Set `GEOCODE_COUNTRIES`
  (e.g. `us`) to keep matches in your country. For heavy traffic, point `NOMINATIM_URL` at a
  paid or self-hosted Nominatim.

## Back office

`/admin` (sign in with `ADMIN_KEY`) is a small dashboard app with a sidebar:

- **Overview:** sales and orders today (vs yesterday), orders to pack, active subscriptions and
  monthly subscription revenue, a 14-day sales chart, what needs attention (oldest unpacked orders,
  stuck checkouts) and the latest orders.
- **Orders:** by status (To pack → Packed → Shipped / Ready to collect → Completed, plus Cancelled
  and Awaiting payment), with search, bulk "Mark packed" and packing slips. Each order opens in a
  side panel with its items, gift messages, addresses, café time, notes and activity. Carrier
  tracking emails the customer; "Ready to collect" and "Cancel" also email the customer.
- **Payments and refunds (Square):** the card, amount charged, refunds, receipt and a link to the
  payment in Square. Refund all or part of an order (with a reason emailed to the customer), or
  "Cancel & refund" in one step. Refunds made in Square show up on the order too.
- **Couriers:** local deliveries and café deliveries show the Uber Direct courier's status, ETA and
  tracking link on the order, with Book courier, Refresh and Cancel.
- **Shipping labels (Shippo):** bought automatically when an order is paid. To buy one by hand
  (or another after voiding), check the weight (estimated from the bags in the order plus the
  box) and address in the order's Shipping panel, get rates from every carrier, and buy it. It opens as a PDF to print, the order is marked shipped and the
  customer is emailed the tracking link. Labels can be reprinted for 30 days and voided (the order
  goes back to Packed). Parcels ship from `SITE.shipFrom` in `js/data.js`; package weights are in
  `SITE.shippingWeightOz`; the box size is `SITE.postage.box`. Without Shippo, ShipStation can
  sell the labels instead (`SHIPSTATION_API_KEY`, `SHIPSTATION_API_SECRET`). Checkout asks for a
  US state, which labels need.
- **Packing slips:** one per page with tick boxes; gift orders print without prices and with the
  gift message as a card; café items in a mixed order are listed separately.
  Gifts can go straight to their recipient: at checkout each gift is "Send to [name]" (their
  address, checked for courier or shipping like any other) or "With my delivery". One payment;
  each address becomes its own order to pack (tagged "Gift to … · paid with AS-…", no money
  of its own, so sales count once), with its own shipping charge. Coffee bags in a café order
  go with the café order (picked up at the bar or by the same courier).
- **Subscriptions:** every plan with its customer, next delivery, price and billing, with skip /
  pause / resume / cancel (Square updated first).
- **Customers:** everyone with an account: active or not (an active subscription, an order or a
  sign-in in the last 60 days), subscriptions, orders, total spent, last order and last seen.
- **Newsletter:** everyone who joined from the site footer.
- **Wholesale:** enquiries from the wholesale page, with a reply link.
- **Wholesale:** accounts for cafés and shops that order on account (billing email, delivery
  address, discount off retail, payment terms such as Net 30), created by hand or from a wholesale
  enquiry. A wholesale order is entered in the back office, priced at the account's discount, and
  joins the normal order queue, so packing slips and ShipStation labels work the same. With Square
  set up, the invoice is emailed by Square straight away (payable within the account's terms) and
  the order is marked paid when Square reports the invoice paid (the `invoice.payment_made` webhook).
  Unpaid and overdue totals show on the Wholesale page. Defaults are in
  `SITE.wholesale` in `js/data.js`.
- **Wholesale prices:** an account can have **Own Prices** (a coffee or tea in a size at a set
  price, instead of its discount) and **Volume Pricing** (with N or more 5 lb bags in one order, a
  percent off those bags; the biggest tier reached applies). The portal's price list, the back
  office's orders and the text assistant all price through `priceWholesale` in `server/trade.ts`.
- **Usual order:** in the portal, **Save as Usual** keeps the order being built (with delivery or
  pickup) and **Your Usual** fills the order with it in one tap. It's the same usual order the text
  assistant saves and reads, so a café can set it either way.
- **Buyers and approvals:** the café runs its own team. In the portal (Account → Team), an owner
  adds or removes logins, makes each an **Owner** or a **Buyer**, and sets the amount a buyer's
  order can reach before an owner has to approve it (empty: every order). New logins are emailed
  how to log in. A buyer's order over it shows **Send for Approval**, is kept (not placed) and
  emailed to the owners, who **Approve** (placed then, at that day's prices, invoiced as usual) or
  **Decline** it in Orders; the buyer is emailed either way. The back office sets only the first
  portal login(s). The text assistant orders as the account, without approvals.
- **Quotes:** in the portal, **Ask for a Quote** sends the order being built (with its note) to
  the team (emailed to the wholesale address). In Wholesale → Quotes, set each line's price (its
  list price shows beside it), a message and how long it's good for, then **Send Quote**: whoever
  asked and the account's owners are emailed. An owner **Accepts** it in Orders (placed at those
  prices, with the quote number as its PO, no minimums or volume pricing on top) or declines it.
  Past its date it shows as expired and can't be accepted.
- **Wholesale portal:** add login emails to an account (and an optional delivery fee), then press
  **Invite to portal**. Each email gets a link to choose a password (valid 7 days; logins that
  already exist get a log-in link instead) and lands on `trade`. Orders placed there join the
  queue like staff-entered ones, with the invoice emailed on the account's terms.
- **Café menu:** sections and items for Order Ahead: name, price, description, dietary labels
  (V, VG, GF, DF), type (hot drink, iced drink, food: without a photo the site draws it), photo,
  **Sold out** (a switch right on each row) and **Show on the menu**. Arrows set the order. The
  Order Ahead pages read it live, and with Square connected every change goes to Square's item
  library (sold out at your location, hidden items archived, photos), so the POS shows the same
  menu. A tick on each row shows it's in Square; a warning means the last push failed (save to retry).
- **Closing and removing:** click a customer to edit their name or login email, **suspend** them
  (signed out, can't log in, active subscriptions paused in Square; unsuspending resumes them) or
  **delete** them (subscriptions cancelled in Square, login and newsletter signup removed, past
  orders kept for the books but stripped of name, email, address and gift messages; open orders
  must be shipped or cancelled first). Customers can delete their own account from `account`
  with their password. Wholesale accounts and suppliers with history are **archived** (hidden from
  new orders, portal logins off, history kept; restore any time); ones without history can be
  deleted. An account with unpaid invoices, or a supplier with open POs, can't be archived yet.
  Wholesale clients ask to close from the portal, which emails the wholesale address.
- **Products:** add, edit, hide or delete coffees: name, roast (Filter or Espresso), whether it's
  also sold ground, 250g and 1kg prices, tasting notes, origin details, label colour, and a photo
  (resized in the browser and stored in the database, served from `/media/…`). A cut-out photo
  (PNG with a transparent background) stands on the shop tile over the bag's shadow and lifts on
  hover like the drawn bag; "Fill the tile" uses the photo edge to edge. Arrows set the shop's order.
  **Labels** ("New Arrival", "Summer Sale") show on products in the shop; give a label a discount
  and every product wearing it sells at that much off, with the full price struck through and
  charged at checkout. Wholesale prices start from the full price. The roast type isn't a label.
- **Green Coffee** (purchasing): suppliers and purchase orders (draft → sent → part received → received, plus
  paid). Sending a PO emails it to the supplier (with Resend set up); deliveries are recorded line
  by line, and POs can be printed.
- **Exports:** orders, subscriptions, newsletter and wholesale as CSV.

Staff sessions last 12 hours and are kept in the database, so deploys don't sign anyone out.

## Email signups (footer)

Every page's footer has an email field with a Subscribe button. `POST /api/subscribe` validates the
address and, with email (Resend) set up, uses **double opt-in**: the signup waits as "pending" until
the person clicks the link in a confirmation email, so strangers' addresses and bots never reach the
list. Unconfirmed signups are dropped after 7 days, and a pending address gets at most one new link a
day. Confirmed subscribers are:

- saved (see "Data storage") and listed in the back office (Newsletter, with pending ones marked),
  downloadable at `/admin/subscribers.csv?key=ADMIN_KEY`;
- POSTed as `{ email, subscribed_at, source }` to `NEWSLETTER_WEBHOOK_URL` if it's set, so they can
  flow into Mailchimp, Klaviyo or a Google Sheet via Zapier or Make.

Without email set up, signups go straight onto the list.

**Welcome code.** Each new signup gets a one-time code (`WELCOME-XXXXXX`) for
`SITE.welcomeDiscount` percent off (10 by default; 0 turns it off), valid for `SITE.welcomeDays`
days. With double opt-in it's made when the link is clicked: the landing page shows it with a Copy
button and it's emailed too. Besides the footer, browsing pages show a small sign-up card once,
after half a page of scrolling or 25 seconds (never over the cookie card, never to signed-in
customers); closing it hides it for 30 days. The back office (Products → Discount codes) counts
welcome codes sent and used rather than listing each one.

## Cookies

A cookie pop-up appears on the first visit (bottom left) with Accept all, Essential only and Choose
(switches for analytics and marketing). The choice is kept for 12 months in browser storage
(`bp-consent`); **Change cookie settings** on the Privacy & Cookie Policy page (linked in the footer)
reopens it. `privacy` lists everything the
site stores. Essential storage (login, cart, Order Ahead choices, Square at checkout) is always on;
the only analytics is Google Analytics, loaded only with consent (below).

### Google Analytics 4

Set `GA_MEASUREMENT_ID` in Render (GA4 → Admin → Data streams → Web → Measurement ID, `G-…`).
Google's script loads only after a visitor accepts analytics; Marketing decides whether ad signals
are allowed (Consent Mode). Turning analytics off later clears the `_ga` cookies.

The shop sends GA4's ecommerce events: `view_item` (product pages), `add_to_cart` and
`remove_from_cart` (cart), `begin_checkout`, and `purchase` once per paid order (with tax,
delivery and the discount code). See them in GA4 → Reports → Monetization. The back office isn't
measured. In GA4, mark `purchase` as a key event, and link Google Ads and Merchant Center if you
use them.

Other scripts that need consent follow the same pattern:

```js
const load = () => cookieConsent.analytics && loadAnalytics();
load();
addEventListener("cookieconsent", load);
```

## Spam defence

Every public form (newsletter, sign up, log in, password reset, wholesale enquiry, FAQ questions) is
checked in `server/spam.js`:

- **Same site:** posts from other websites are refused.
- **Honeypot:** each form has a hidden field that people never see; bots that fill it in are told
  it worked, and nothing is saved or sent.
- **Form token:** pages fetch a signed token when they load and send it back. Scripts posting
  straight at the API have none, and bots that submit within a second or two of the page loading
  are turned away (a person who's that quick is retried automatically after the short wait).
  Set `FORM_SECRET` (render.yaml generates one) so tokens survive restarts.
- **Content:** links or markup in names, link-stuffed messages, throwaway inbox services, and email
  domains that can't receive mail (DNS MX lookup; `EMAIL_DOMAIN_CHECK=off` turns that part off).
- **Rate limits:** per visitor and site-wide for each form, plus 8 wrong passwords in 15 minutes
  locks logins to that account (password reset still works).

## Accounts and subscriptions

Customers create an account with name, email and password (`login`). Subscriptions bought while
logged in are saved to their account (with Square payments, an account is required), and `account` lets them skip the next delivery, pause,
resume, change coffee, size or frequency, or cancel.

- Passwords are hashed with scrypt; sessions are HttpOnly cookies and only their hashes are stored.
  Prices are always computed on the server.
- Download every subscription with customer, status and next delivery date:
  `/admin/subscriptions.csv?key=ADMIN_KEY`.
- Forgotten passwords: "Forgot your password?" on `login` emails a one-time link (valid for an
  hour) to `reset`. Emails are sent with [Resend](https://resend.com): set `RESEND_API_KEY` and
  `EMAIL_FROM` (an address on a domain verified in Resend). Links use `SITE_URL`, or Render's own
  address if that isn't set. Without Resend configured, the form asks customers to email you.

## Newsletters

- Back office → Newsletter → **Newsletters**: write a newsletter from blocks (heading, text,
  image, button, coffee card, divider) with a live preview, send yourself a test, then send it
  to every confirmed subscriber. Text takes blank lines for paragraphs and `**bold**`; a coffee
  card shows the coffee's photo, notes, price and link from Products.
- Sending goes through Resend's batch API, 100 emails per request, from `NEWSLETTER_FROM` (or
  `EMAIL_FROM`). A deploy or restart mid-send carries on where it stopped.
- Every newsletter has an unsubscribe link and one-click unsubscribe headers (Gmail, Apple Mail),
  and the mailing address set on the Newsletters tab (US CAN-SPAM). Sending is blocked until the
  address is set. People who unsubscribe show as Unsubscribed and are never mailed again unless
  they sign up afresh.

Senders by kind (each optional, falling back to `EMAIL_FROM`; addresses on domains verified in
Resend): `ORDERS_FROM` (confirmations, shipping and pickup updates, refunds, returns, gift cards,
back in stock, class tickets), `WHOLESALE_FROM` (invoices, wholesale invites, supplier POs),
`ACCOUNT_FROM` (password resets, email confirmations), `AUTOMATIONS_FROM` (welcome, abandoned
cart, after an order, running low, win-back), `NEWSLETTER_FROM` (newsletters, signup and welcome
code) and `INBOX_FROM` (Inbox replies). Notices to the shop itself go from `EMAIL_FROM`.

## Search (in the menu)

- "Search" is in the menu, after True Specialty. Tapped, it opens into a field with quick picks
  (Espresso, Filter, Decaf, Accessories, Subscriptions, Gift A Subscription) in place of the menu;
  typing finds coffees by name, origin, region, tasting notes, process or variety, accessories,
  pages and FAQ answers, from the site's own data. Enter opens the first result; Cancel goes back
  to the menu. ./#espresso, #filter and #decaf open the shop with that roast chosen.

## Inbox (customers who want a person)

- Back office → Inbox. Conversations arrive from the contact form, from the chat window
  ("Chat Us" in the footer, or "Talk to a person" on the FAQ page; tagged Chat, with the
  assistant conversation so far), and from emails to the shop (tagged Email). New ones are
  unread, counted in the sidebar, and the shop is emailed.
- The chat window is answered by the shopper assistant first (see Assistants below; switch it off
  in back office → Assistant) and otherwise works like a support chat: the customer just writes, with
  no name or email asked (a logged-in customer is known by their account). Their first message
  starts a conversation in the Inbox ("Visitor" when we don't know who it is). It's live both
  ways: replies show in their chat within a few seconds (emailed too when we have an email), an
  open conversation in the back office shows new messages as they arrive, and a dot on "Chat Us"
  tells a returning customer there's a reply. The chat shows "Online now" while the back office
  is open somewhere (any page, in the last few minutes), and otherwise "Away right now, back
  soon", with a note under their message that we'll be back and reply right there. Inbox →
  Available / Away sets it by hand. Questions asked on the FAQ page first go along to the Inbox.
- A reply is held for 10 seconds before it's emailed: "Sending in 7s. Undo · Send now". Undo
  puts the text back in the box to fix. Replies held during a deploy go out once it's back.
- Replies go from `INBOX_FROM` (or `EMAIL_FROM`) with Reply-To `INBOX_ADDRESS` and the
  conversation's reference in the subject (`[#a1b2c3]`), so the customer's answer comes back into
  the same conversation.
- Receiving email needs Resend receiving: turn it on for a domain (a subdomain such as
  `reply.mimifood.com` keeps your normal mailbox untouched) or use your `.resend.app`
  address, set `INBOX_ADDRESS` to an address there, add a webhook for `email.received` at
  `https://<your-site>/api/resend/inbound`, and set `RESEND_INBOUND_SECRET` to its signing
  secret. To have mail sent to your usual address land here too, forward it to `INBOX_ADDRESS`.
- Texts (iMessage, for wholesale), through Photon Spectrum: set `PHOTON_PROJECT_ID` and
  `PHOTON_PROJECT_SECRET` (Photon dashboard → Settings). The server keeps a stream open to Photon;
  each text lands in the Inbox as an iMessage conversation, matched to a wholesale account by
  phone number (last 10 digits) or email, and staff replies go back by iMessage. Reply-only: we
  never text anyone first. **Text Us** in the wholesale portal texts +1 (415) 605-6081
  (`SITE.wholesaleText` in `js/data.js`; `PHOTON_TEXT_NUMBER` overrides it) once Photon is connected.
- The texting assistant (`server/textagent.js`, needs `ANTHROPIC_API_KEY`) answers those texts
  like a person at the roastery: short texts, a tapback now and then. It looks up the account,
  prices and orders, and can quote, place, change (before packing or payment) or cancel orders
  and re-send invoices, through the same code as the wholesale portal. It confirms with the
  customer before changing anything, says it's the team's assistant if asked, and hands off to
  the team (email to the wholesale address) for complaints, refunds or anything it can't do.
  Each action shows as a note in the conversation and is emailed to the orders address. A staff
  reply turns it off for that conversation; **Assistant On / Off** in the conversation switches it.
  Texts are matched to an account by phone number, so keep account phone numbers current.
- iMessage touches: read receipts both ways (we mark theirs read when the assistant answers or
  staff open the conversation; theirs show as "Read 2:14 PM" under our latest text they've read),
  the typing bubble (while the assistant works, and while staff type a reply in the Inbox),
  tapbacks, the shop's contact card (logo, number, email, site, roastery: tap to add) plus Apple's
  Share Name and Photo before the first text in a conversation, threaded replies when several
  texts come in at once, a preview card for a link sent on its own, and an effect (confetti,
  balloons…) only for a real moment like a first order. Photos and PDFs customers send show in the
  Inbox (back office only) and the assistant can see them; iPhone HEIC photos become JPEGs. It
  can't listen to voice notes or watch videos.
- Also: their tapbacks on our texts show in the Inbox ("Lee reacted 👍 to …") and the assistant
  reads a 👍 on a yes/no question as a yes; photo albums arrive as all their photos; poll votes
  come back as texts. The assistant can send a poll for a clear choice (a delivery day) and the
  photo of a coffee or tea. Staff can edit a sent text for 15 minutes (5 times) and unsend it for
  2 minutes, as in Messages (only texts sent since the server last started).
- Staff on a text conversation: tap any text (theirs or ours) for a tapback or Reply (threaded on
  their phone); send with an effect; and beside Send, a photo or PDF, a voice note (recorded in the
  browser, sent as an iMessage voice message, converted to M4A by `ffmpeg-static` when the
  browser records something else) or a poll (2 to 6 choices). The shop's contact card goes once
  per person, not once per conversation.

- **Ratings.** Send & Close asks them to rate the conversation (😠 to 🤩). The Rated tab lists
  rated conversations, lowest first, under the last 30 days' average. A Terrible or Bad rating
  emails the shop (once per conversation) with a link to follow up.

- **Carry on in the chat.** "Our chat" in a conversation's emails is a signed link to that
  conversation: it opens the chat on the site with the emails so far, and what they write there
  joins the same conversation (marked "In chat" in the Inbox). Replies then show in their chat,
  and go by email too if they haven't seen them within 5 minutes.

## Assistants (shoppers, wholesale, the team)

All three need `ANTHROPIC_API_KEY`; their tools run the shop's own code. Instructions and tool
definitions are in `server/agents.js` (shoppers, team) and `server/textagent.js` (wholesale).

- **Shoppers, in Chat Us.** Finds products (cards with Add buttons), plans how much they need
  and suggests a subscription, puts things in their cart, tracks an order (number and email, or
  their own when logged in), shows and skips/pauses/resumes their subscriptions, and remembers
  their tastes when they're logged in. It hands off to the team (an email, and the conversation
  stays in the Inbox) for refunds, damage, changes it can't make, or when asked; a staff reply
  turns it off for that chat. On by default; back office → Assistant → Chat Us switches it.
- **Wholesale accounts, by text (Photon) and in Chat Us when logged in to the portal.** The
  texting assistant above, plus memory (what they serve, preferences) and a saved usual order
  ("the usual" is one text), and it works out quantities from how much they serve.
- **The team, in back office → Assistant and by text from a staff phone.** Sales (with the period
  before), a product's sales, stock with weeks left and who's waiting, subscriptions, discount
  codes and what they brought in, automated emails and newsletters, wholesale balances, orders,
  and what's waiting in the Inbox. Changes are proposals: prices, stock, sold out, discount codes,
  automated emails on or off, a text or email to a wholesale account. Nothing changes until it's
  approved (the button under the answer, or "yes" in the text thread). It writes newsletter
  drafts but never sends one. Add staff phones on the Assistant page; texts from those numbers get
  the team's assistant (the Photon project must let those numbers through). What it's asked to
  remember shows on that page, and can be forgotten.

## Numeral (the blog, for search)

Back office → **Numeral**: write short posts (brewing guides, new coffees, visits to
producers) and publish them at `/numeral/<address>`. The footer links to **Numeral** once one is
published; `/numeral/` lists them, newest first. (Older `/notes/…` and `/numberal/…` addresses redirect to `/numeral/…`.)

- The page is built on the server, so search engines read the whole article: its own title and
  summary (the search result text), a canonical address, social-preview photo, `BlogPosting`
  structured data, and a place in `/sitemap.xml` with the date it last changed.
- Writing: blank lines between paragraphs, `## Heading`, `### Smaller heading`, `**bold**`,
  `*italic*`, `[link text](https://…)` or `[text](subscriptions)`, `- list`, `1. list`,
  `> quote`. **Add photo** and **Add a coffee** put a photo or a shop coffee (photo, price and a
  link to buy, kept current from Products) where the cursor is. The preview is the real page.
- The address follows the title until you change it or publish. If a published post's address
  changes, the old one redirects to the new one.
- Posts are in English. On /es/ and /ko/ the page around them is translated, and search engines
  are pointed to the English page.
- Photos are stored with the newsletter images and served from `/media/`.
- **Posts that ship with the site:** a Markdown file in `content/numeral/` (front matter:
  `title`, `slug`, `date`, `description`, `image`, `imageAlt`, then the post) is published
  once, the first time the site starts with it. Changes to the file reach the post on the next
  deploy, until the post is edited (or deleted) in the back office; from then on the back office
  version stands and the file is ignored.

## Automated emails

- Back office → Newsletter → **Automations**: five emails that go by themselves, each with an
  on/off switch, its timing, and the same block editor (plus a "Their coffees" block):
  - **Welcome**: the founder's note, days after a newsletter signup is confirmed, or after
    someone makes an account (shop or wholesale portal); once per email, whichever is first.
  - **Abandoned cart**: hours after a checkout that was started and not paid. "Back to your
    cart" opens `/checkout?cart=…` with those coffees back in the cart.
  - **After an order**: brewing tips and their coffee, days after a coffee order (once a month
    at most).
  - **Running low**: days after a one-off coffee order (separate timings for 250g and 1kg),
    unless they've ordered again or have a subscription.
  - **Win back**: days after a customer's last order, unless they subscribe (once in 180 days).
- A check runs every 15 minutes (`server/automations.js`). Each person gets each email once,
  only when it becomes due after it's switched on, and never if it was due over 3 days ago.
  Emails fill in `{first_name}`, `{welcome_code}`, `{cart_link}` and `{shop_link}`.
- Every one carries the mailing address and its own unsubscribe link (signed, one-click), which
  stops all of them and the newsletter. The Automations tab shows how many went out and the
  orders placed within a week of one.

## Green coffee, roasting and stock levels (back office)

- **Sidebar** groups pages by job: Sell, Make (Roasting, Products, Café Menu), Buy (Green
  Coffee), Marketing, Business.
- **Stock levels:** Products → Stock shows each count as a bar against its reorder level (the
  tick; empty uses the default of 5), set per product. The Low filter lists what's at or under it.
- **Green Coffee → Stock:** each green coffee we buy (`server/green.ts`): supplier, cost per kg,
  kg on hand, reorder level and how much to order, the shop coffees it's roasted into, and what's
  promised to planned roasts and on order. **Add to Cart** puts its usual order in the cart.
- **Cart:** grouped by supplier; Save for Later keeps a line without ordering it. **Create
  Purchase Orders** makes one per supplier, emailed to those with an email when ticked (else a
  draft to send). Receiving a purchase order adds its kilos to that green coffee.
- **Roasting:** the roast schedule, a month on a computer and a list by day on a phone. Plan a
  roast (day, coffee, green coffee, kg; about how many 250g bags it makes, at 15% roast loss).
  **Mark Roasted** takes the kilos and adds the bags made to the coffee's stock count (when it's
  counted); Undo puts both back. A roast without enough green coffee (counting the ones before
  it) is flagged, and coffees at their reorder level with nothing planned are listed first.
- The Overview's Needs You lists roasts planned for today and green coffee to reorder.

## Abandoned carts (back office)

- **Abandoned Carts** (under Sell) lists the last 30 days' checkouts that weren't finished: ones
  left before Pay (once an email was typed in) and orders where Pay was pressed but never went
  through, an hour or more ago, one per person. Each shows the coffees, the value, when it was
  left, whether the reminder email went, whether the team wrote, and whether they came back and
  ordered (any paid order from that email since). Tabs: To Reach Out, Reached Out, Came Back,
  Dismissed (a test or a duplicate; Undo brings it back).
- **Reach Out** opens the cart with a note to them: write it yourself, or **Write With AI**
  (Claude drafts a short note naming their coffees, with their cart link, to edit before
  sending). **Send** emails it from the shop's address as an Inbox conversation, so their reply
  lands in the Inbox; **Open in Inbox** goes there.
- Kept with the other checkout drafts (`checkoutdrafts`) and the notes sent (`carts`), 30 days.

## Logo in mail apps (BIMI)

The round picture beside the sender's name in a mail app is set by the mail app, not by the
email. BIMI lets it show the Mimi Food logo for everything sent from `@mimifood.com` (one logo for
the domain; staff photos show inside conversation emails instead). The logo is ready at
`/assets/bimi-logo.svg` (SVG Tiny PS, square, white background, under 32 KB). In your DNS:

1. **Check every sender passes.** Resend's SPF and DKIM records for `mimifood.com` should show
   Verified. Anything else that sends as `@mimifood.com` (Google Workspace, a form tool) needs
   its own SPF/DKIM too, or step 3 sends its mail to spam.
2. **DMARC, watching only.** TXT record `_dmarc` →
   `v=DMARC1; p=none; rua=mailto:REPORTS-ADDRESS` (a mailbox or DMARC report service, not
   the Inbox). Leave it a week or two and check the reports show everything passing.
3. **DMARC, enforced.** Change it to `v=DMARC1; p=quarantine; pct=100` (keep `rua` if you
   use it). BIMI needs `quarantine` or `reject`, at 100%.
4. **BIMI record.** TXT record `default._bimi` →
   `v=BIMI1; l=https://mimifood.com/assets/bimi-logo.svg;` (the live site's address). Yahoo and
   AOL can show the logo from this alone.
5. **Certificate, for Gmail and Apple Mail.** Buy a mark certificate (DigiCert or Entrust)
   for the logo: a **VMC** needs the logo as a registered trademark and works in Gmail and
   Apple Mail; a **CMC** needs a year of the logo in public use and works in Gmail. Host the
   `.pem` it comes with (the issuer can, or put it in `assets/`), then add it to the record:
   `v=BIMI1; l=https://mimifood.com/assets/bimi-logo.svg; a=https://…/certificate.pem;`
6. Check it with a BIMI checker (search "BIMI inspector"). Mail apps cache, so it can take a
   few days to appear.

## Tea

Teas are entries in `ACCESSORIES` (js/data.js) with `category: "Tea"` (Khan, Mei): their own shop
section (Menu → Shop → Tea, `/#tea`), drawn as the cup (`assets/tea-cup.webp`, cut out from the
product photo) with its lid labeled in the tea's `color`, floating on the shadow like the bags.
`ingredients` lists what's in it and what each brings. Tea is food: taxed as groceries and not
returnable. Each tea has a `type` from `TEA_TYPES` (the shop's Tea filters: Green, Matcha, White & Yellow, Oolong, Black, Puerh, Herbal; only kinds in stock show) and may name its `cultivar` (an id in `js/tea.js`), which Find Your Tea uses to ask about cultivars (the glossary is also given to the FAQ assistant). Add glossary entries in our own words as new cultivars come in. The guide for customers is the Numeral post `content/numeral/2026-10-what-is-a-tea-cultivar.md`; /tea-cultivars redirects to it. With `price: null` a tea shows "Coming Soon" and can't be ordered; set its price to
put it on sale.

Teas are edited in the back office (Products → Tea): name, lid colour, kind, cultivar, notes,
price (empty for Coming Soon), packed weight, the story and ingredients, shown or hidden, sold
out. The teas in `js/data.js` are copied in on first start only; after that the back office is the
source of truth and the shop gets the live list in `js/data.js` (like the coffees).

Every tea shows the plain cup (`TEA_CUP_PHOTO` in js/data.js, `assets/teas/cup.webp`, cut out of
the product shot), floating on its shadow like the bags, unless the back office tea form gives it
its own photo ("Use the plain cup" goes back). The lid colour stays for the lid label and swatches.
In the back office a tea's **Lid label** opens its print file (server/lidlabel.js, `/admin/lid/<id>`):
true size, 2 mm bleed, words 3 mm inside the cut, the cut line as its own CutContour layer,
"Show Guides" for a proof, Print or Save PDF, or Download SVG.

## Accessories

`ACCESSORIES` in `js/data.js` (the Flat White Tee and the Ceramic Coffee Dripper to start). The
shop has sections, as the menu does (Shop → Coffee, Accessories, Limited Drop: `coffee`,
`#accessories`, `#limited`). Coffee then splits by roast (Espresso, Filter, Decaf, with the coffee
finder). **Limited Drop** is anything with the label "Limited Drop" (back office → Products →
labels; for an accessory, `labels: ["Limited Drop"]`). Until there is one, it shows "The next drop
is on its way" with a button to the email signup. Each accessory has a
page at `product?id=<id>`, and go in the cart and through checkout and Apple Pay like
coffee. The server prices them (`server/orders.js`), counts them toward free shipping and the
parcel weight (`weightOz`), and keeps them out of the subscriber discount (coffee only) and out
of café orders. `sizes` gives a size choice (the tee); `art` draws the product, floating on the
same shadow as the bags, until a photo is set in `image`. **Prices and descriptions are
placeholders: set them in `js/data.js`.**

## You might like (cart)

One or two suggestions above the subtotal: a coffee of the other roast (one that takes the order
past free shipping when it's close), and an accessory (the dripper for filter buyers). Never
what's already in the cart or sold out; none with café orders or subscription-only carts.
**+** adds a 250g bag of whole beans (or the accessory); the tee links to its page for a size.

## Subscriptions and the coffee finder

- Any coffee can be subscribed to from its product page ("Subscribe & save 15%": its own
  sizes, 250g or 1kg, at its price less `SUBSCRIPTION.productDiscount` (15%), with the grind
  chosen there). Subscriptions built on the subscriptions page get `SUBSCRIPTION.discount` (18%). The rotating
  Espresso / Filter / House Blend subscriptions stay on the subscriptions page. Both kinds bill
  in Square (a plan per coffee, made as needed) and can be changed from the account page.
- The subscriptions page compares subscription and one-time purchase ("Ways to save"), from the
  shop's own settings (discount, free-shipping threshold, flat rate).
- The menu groups Start A Subscription, Gift A Subscription (opens the builder on the gift) and
  Manage My Subscription (the account page) under Subscriptions.
- **Prepaid gifts.** A gift subscription can be ongoing (charged per delivery in Square, as
  above) or 3, 6 or 12 monthly deliveries paid up front (`SUBSCRIPTION.prepaid`), at the
  subscription price, charged once like any other item (no Square subscription). The first box
  goes with the order; the server makes an order to pack for each later delivery when it's due
  (checked hourly, $0, linked to the paying order) until the last one, then the gift shows as
  Complete. The buyer gets an account showing how many have been sent and can skip or pause;
  changes and refunds go through the shop (back office → Subscriptions can cancel).
- **Subscriber discount.** Signed-in customers with an active subscription get
  `SITE.subscriberDiscount` percent (15 by default) off coffee bags bought on their own. It
  shows at checkout and goes to Square as an order discount. It doesn't stack with a
  money-off code: the bigger saving counts and the smaller code isn't used up (a free-shipping
  code still applies alongside it).
- /find-your-coffee: three questions (brew method, flavours, how much) match a coffee from
  the live list by roast and tasting notes, skip sold-out ones, and suggest a size and schedule.
- /find-your-tea: three questions (when they drink it, flavors, how much) match a tea from the
  teas on sale by caffeine and its notes and ingredients, and suggest a delivery schedule. New
  teas join the quiz once they're in the shop.

## Returns

Coffee can't be returned. Anything else can, unused, within `SITE.returns.days` (14) of delivery,
free. The customer starts a return from the order's tracking page:

- **Drop-off at Roastery House:** they get a QR code (on the page and by email). Staff scan it with a
  phone; it opens the return in the back office (Returns), and **Check In and Refund** refunds the card.
- **By mail:** a prepaid return label is made at once through Shippo: USPS when it has a rate (charged only
  when used), else the cheapest other carrier (voided, so refunded, if unused after 21 days). If Shippo
  can't make one at all, the return still starts and the label is emailed once it can (retried every
  15 minutes; the shop is emailed after two hours). The label is emailed with the QR code to put in
  the box. When Shippo shows it delivered, the shop is emailed;
  scan the code from the box to check it in.

The refund is the items' price, less their share of any code, plus their sales tax.

## Reviews

The email a few days after an order ("After an order") links to `/review`, signed for that order:
the buyer rates each coffee or accessory on it. Reviews show on the product page, and in Google's
results (stars), only once real ones exist. Hide one from the back office (Reviews).

## Gift cards (Square)

`/gift-cards` sells digital gift cards ($25, $50, $75, $100, or any whole amount from $10 to
$500, set in `SITE.giftCards`). They need Square payments on. Each card is a gift card line on
the Square order (so Square books it as money owed, not a sale, with no tax), and is issued in
Square and activated against that line once paid. The person it's for gets an email with the
amount, the message and an **Accept Gift Card** button to their gift link (`/gift/<token>`, private,
not indexed). There they accept it and see its number and balance; the browser keeps it, and
checkout applies it on its own. The link's preview (iMessage, mail apps) is the card at its
amount, with who it's from. Codes and the subscriber discount never take money off
gift cards. Gift cards count toward free shipping on the rest of the order.

Keeping it: the gift link always works (bookmark it, or find the email or text). Signed in, **Add
to Account** saves it; cards sent to an account's confirmed email show there on their own. The
account page lists them with balances, and checkout applies one on any device. Lost it?
**Lost your gift card?** on `/gift-cards` emails it again to the address it was sent to.

Their mobile is optional. If that number already has an iMessage conversation with us (Photon),
their gift link is texted there too, as a rich link (the card, who it's from), with confetti, and
shows in that conversation in the Inbox. We don't
start new conversations: without one, it's email only.

Paying with one: **Have a gift card?** at checkout checks the balance with Square and shows what
it covers. It pays first, held, then the card pays the rest, held, and Square takes both together.
If the card is declined, the gift card hold is released. Refunds go back to the card first, then
the gift card. `/gift-cards` also has **Check a Balance** (rate limited). In Roastery House, Square
POS takes the same cards by their number.

Back office → Products → **Gift Cards** lists the cards sold with their balances, emails one again,
and issues any an order is still owed (if Square was down when it was paid).

## Stock and Notify Me

Back office → Products → **Stock**: type how many are left of any product (or of each size of
the tee, each color of the dripper). Leave it empty to not count it. Coffee is counted in 250g
bags; a 1kg bag takes 4. Paid orders take from the count and cancelled orders put it back.

- At 0 the product shows **Sold Out** (as the Sold out switch does), and its page offers
  **Notify Me**: an email box for when it's back. A sold-out size or color is struck through.
- At 5 or fewer, shop cards show **Only N Left** and the product page says how many are left
  for the size chosen; quantities can't go over what's left. Checkout and payment both check
  again, so the last ones can't be sold twice.
- When something can be bought again (its count goes up, or the Sold out switch goes off),
  everyone waiting gets one email with a link to it, in their language, and is then forgotten.
  The Waiting column shows how many are waiting.

In-store sales in Square POS don't change the counts; adjust them here.

## Google Shopping (Merchant Center feed)

`/feeds/google.xml` lists every product on sale for Google Shopping's free listings and ads,
built from the live catalog (prices, new coffees, sold out). Coffees are two items each (250g,
1kg), the tee one per size, the dripper one per color. Photos are drawn for the feed at
`/feeds/images/<id>.jpg`, on white: a coffee's bag with its label, a tea's cup, or the product's
own photo. Drawn accessories without a photo are left out until they have one.

Set up: Merchant Center → Products → Add product source → "Add products from a file" →
"Enter a link to your file": `https://<your site>/feeds/google.xml`, fetched daily. Set the
return policy (14 days on accessories, none on coffee and tea) and link
`/shipping-returns` in Merchant Center too.

### Merchant API (instant updates)

With the Merchant API set up, the server sends the same items to Merchant Center itself, a few
seconds after anything changes (a price, a sold-out coffee, a new tea), instead of Google
fetching the file once a day. Only changed items are sent; items taken off sale are removed;
everything is sent again every 25 days (Google drops products not refreshed in 30). Nothing is
sent until the shop is live. Products (Coffee and Tea) shows how many are in Google.

1. Google Cloud console: make a project, enable the **Merchant API**, and create a **service
   account** with a **JSON key**.
2. Merchant Center → Settings → People and access: add the service account's email as a user
   with **Admin** access.
3. On Render, set `GOOGLE_MERCHANT_ID` (the Merchant Center account number, top right in Merchant
   Center) and `GOOGLE_MERCHANT_KEY` (the JSON key's whole text). Optional:
   `GOOGLE_MERCHANT_DEVELOPER_EMAIL` (a person's email for Google's API notices).
4. Deploy. On first use the server registers the Cloud project with the account and makes a
   product source named "Mimi Food website (API)". To use one you made in Merchant Center instead,
   set `GOOGLE_MERCHANT_DATA_SOURCE` to its ID.
5. Once products show under that source, remove the file source (`/feeds/google.xml`) in
   Merchant Center, so each product comes from one place.

Problems are written to the server log as `[merchant] …`.

## ChatGPT shopping (OpenAI product feed)

`/feeds/openai.jsonl` (one item per line; `/feeds/openai.json` is the same as one array) lists
the same items as the Google feed in OpenAI's product feed fields: the nine required ones, a
coffee's 250g and 1kg as variants of one listing (`?size=1kg` opens its page with 1kg picked),
net weight, shipping price, returns (coffee and tea are final sale; gear within the return
window), and product reviews once a product has some. Search is on; checkout inside ChatGPT is
off, as it's a separate integration, so buying happens on our site.

Set up: in OpenAI's merchant onboarding, give it `https://<your site>/feeds/openai.jsonl` as the
product feed. The feed is empty until the shop is live.

## Lead score

Customers, Wholesale accounts and the Inbox show a score from 0 to 100 (High 60+, Medium 30+)
with up to three reasons in plain words ("Spent $420 over 6 orders", "Asked about pricing",
"Invoice overdue"). `server/leadscore.ts` holds the weights, set by hand for now; once there are a
couple of hundred outcomes they can be fitted to sales history with the same features.

- Fit (up to 40): spend, how often they order, a subscription, a wholesale account; overdue
  invoices count against.
- Engagement (up to 60, last 30 days): pages and time on the site, cart adds, messages on any
  channel, how fast they reply, and what their messages are about.
- Site activity is recorded only for signed-in customers (wholesale portal logins included) who
  allowed analytics: the page and its time on screen, sent every 15 seconds and when the page is
  hidden, and cart adds. Kept 90 days (`activity` store). The privacy policy says so.
- Every 15 minutes Claude (the quick model) tags new customer messages: ready to order, pricing,
  question, complaint, leaving, other. Tags are kept on the message, used only for the score.

## Checkout

- The order summary is editable: quantities and Remove, right there.
- Details are filled in from the signed-in account and this browser's last order.
- Discount codes (back office → Products → Discount codes): percent or amount off, or free
  shipping; optional minimum order, end date and usage limit. Not for subscriptions. The code is
  checked again when the order is placed, sent to Square as an order discount, and counted once
  paid. Codes can only be tried 15 times per visitor per window, so they can't be guessed.
- Coffees can be marked Sold out (Products, or the switch in the list): they stay in the shop,
  marked, and can't be bought.
- Product pages carry schema.org Product data (price, in stock / sold out) for search results.

## The shop as a phone app

The site installs as an app as it is, header, menu and cart included (`site.webmanifest`,
`sw.js`). On iPhone: Safari → Share → Add to Home Screen. On Android and desktop Chrome or
Edge: the browser's install button, or "Install App" in the site menu. Pages come from the
network first, so a deploy shows up straight away; pages already opened still work without a
connection, and others show `offline`. Checkout, account and other API calls always need
a connection and are never cached. Shortcuts on the app icon: Order ahead, Shop, My account.

## Back office as a phone app

The back office installs like an app (`admin.webmanifest`, `admin-sw.js`): open `/admin`
on a phone and choose **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android
Chrome: the menu, or **Install app** in the back office's More list). It opens full screen
with a blue Mimi Food icon, and the icon shows how many orders are waiting to be packed (where the
phone supports badges). On phones the main sections sit in a tab bar along the bottom
(Overview, Orders, Products, Menu, More). Numbers refresh every minute and whenever the app
comes back to the front. Without a connection the app still opens and says it's offline; it
reloads when the connection returns. Nothing from the API is cached on the phone.

## Back office theme (Untitled)

The back office uses the Untitled Graphical theme: guidance in `GUI.md` and `gui/`, agent skills in
`.agents/skills/`. Its tokens (both light and dark, following the device setting) are defined at the
top of `admin.css`; the shop's `styles.css` is unchanged.

- **Icons:** Lucide (outlined), from the `lucide` npm package, served at `/vendor/lucide.min.js`.
- **Fonts:** the theme's font is GT Standard (licensed); its free fallback is Timeless Grotesk.
  Neither file is in the repo yet, so the back office currently shows the system sans-serif.
  To finish: download Timeless Grotesk (Grotesk cut, weights 400/500/600) from
  https://timeless.co/type, put the `.woff2` files in `assets/fonts/` and uncomment its
  `@font-face` rules at the top of `admin.css`. To use GT Standard, buy a web licence at
  https://www.grillitype.com/shops/gt-standard, add its files the same way and uncomment its rules;
  it takes priority automatically.

## Data storage

Orders, accounts, sessions, subscriptions, email signups, wholesale enquiries and back-office
sign-ins are kept in **Postgres** when `DATABASE_URL` is set (`server/storage.js`). `render.yaml`
creates a Render Postgres database and connects it, so data survives deploys and restarts.

- One table, `records (store, part, id, data jsonb)`: each order, user, subscription and so on is a
  row holding its JSON. The server keeps a copy in memory for speed and writes only what changed,
  in a transaction. It runs as a single instance; don't scale it to several instances.
- If the database is briefly unreachable, the site keeps serving pages; anything that needs saving
  returns an error and can be retried, and the server reconnects by itself.
- On deploy, the server finishes pending writes before stopping.
- Without `DATABASE_URL` (local development) data is saved as JSON files in `DATA_DIR`
  (default `./data`). The first time the server starts with an empty database, it imports
  whatever is in those files.
- Use a paid Render Postgres plan for the live shop: free databases expire after 30 days.

## Deploy on Render

`render.yaml` defines a Node web service called `Mimi Food-coffee` (`npm ci`, then `npm start`) and its
Postgres database. In Render, choose **New → Blueprint**, pick this repo and branch, and apply.
Render asks for the keys marked `sync: false` (Anthropic, Square, Uber Direct, Shippo, Resend and the optional ones);
paste them in the dashboard and never commit them. It also generates `ADMIN_KEY` (find it under
the service's Environment tab).

The site must run as a **web service**, not a Static Site: checkout, payments, accounts, the back
office and the FAQ answers all need the server. Render can't change an existing service's type,
which is why the service is named `Mimi Food-coffee`; an older `black-paper` static site can be
deleted once the new service is live (move any custom domain over first).

Invoice links (in the invoice email and from the text assistant) are signed: `/i/<order>?e=&t=`, good
for 30 days. The page shows the invoice's number and amount to link previews, and a browser that
opens it is signed in as the account's portal login and taken to the invoice (`/api/invoice-link`;
previewers and mail scanners don't run that step). An expired or altered link, or an account with
no login yet, goes to Log In, titled with the invoice, and on to it after.
