// ─────────────────────────────────────────────────────────────
// Mimi Food site content. Every page reads from this file.
// All coffees, prices, addresses and hours are PLACEHOLDERS.
// ─────────────────────────────────────────────────────────────

const SITE: any = {
  name: "Mimi Food",
  email: "cs@mimifoodusa.com",
  ordersEmail: "cs@mimifoodusa.com",
  wholesaleEmail: "cs@mimifoodusa.com",
  // The wholesale texting line (Photon, iMessage). Customers text first: the portal's Text Us
  // opens their Messages app. It shows once Photon is connected (PHOTON_PROJECT_ID and SECRET).
  wholesaleText: "",
  instagram: "mimifood",
  // Profiles elsewhere (Google Maps, Yelp, Apple Maps, TikTok…): full links. They tell search
  // engines and AI assistants these are all the same Mimi Food (schema.org sameAs, /llms.txt).
  sameAs: [],
  // Checkout happens on Shopify: the cart goes to this store as a cart link when every item has a Shopify variant id.
  shopify: { domain: "mimifoodusa.com" },
  currency: "$",
  currencyCode: "USD", // for card payments (Square)
  freeShippingOver: 60,
  // Coffee can't be returned; everything else can, unused, within `days` of delivery, free.
  returns: { days: 14 },
  // Digital gift cards (Square Gift Cards): the amounts offered, and the range for "Other".
  giftCards: { amounts: [25, 50, 75, 100], min: 10, max: 500 },
  // Roast days (0 = Sunday … 6 = Saturday). Shown on coffee pages as the next roast date.
  roastDays: [1, 4],
  // Café drinks delivered from a bar (Order Ahead → Delivery), by an Uber Direct courier.
  cafeDelivery: { fee: 6, minimum: 15, leadMinutes: 45, radiusKm: 5 },
  // Order Ahead "as soon as possible": ready in `minutes` (delivery: cafeDelivery.leadMinutes),
  // plus perCup minutes for each drink ahead in that bar's queue ("2 cups ahead of you").
  cafeQueue: { minutes: 15, perCup: 2 },
  // Coffee bags going to an address within radiusMiles of Roastery House (327 S Western Ave) go by
  // Uber Direct courier, booked when the order is marked packed; further away, they ship
  // (Shippo labels, see postage).
  // Local delivery goes the same day when ordered at least sameDayMinutes before Roastery House
  // closes; later orders wait for the courier's morningPickup the next day it's open.
  // The customer pays the courier's fee, or nothing when the order ships free anyway (over
  // freeShippingOver, a free-shipping code, subscriptions); maxFee caps what they pay (the shop
  // covers the rest), null for no cap.
  localDelivery: { radiusMiles: 10, from: "roastery", sameDayMinutes: 30, morningPickup: "07:00", maxFee: 4.99 },
  timezone: "America/Los_Angeles",
  shippingFlat: 5.95, // when no live price can be had; kept at or under postage.maxFee
  // Sales tax: charged where the order goes (a delivery address, or the bar for pickup) in
  // California, and in any other state the shop has turned on in the back office (Sales tax)
  // once registered there. Each kind of item is taxed as its state taxes it (see taxClass):
  // in California, coffee beans are food (not taxed), accessories and café food and drinks
  // are; shipping and delivery charges and class seats aren't. California's rate is the
  // address's own, from the CDTFA's tax rate lookup; defaultRate (Roastery House's, Los Angeles)
  // stands in when that can't be reached.
  salesTax: { state: "CA", defaultRate: 0.0975 },
  // Shipping by post costs the cheapest carrier's price for the parcel to the customer's address,
  // looked up at checkout through Shippo (SHIPPO_API_TOKEN in Render: USPS, UPS, FedEx, …), and
  // that label is bought as soon as the order is paid (autoLabels). Services slower than maxDays
  // aren't offered. Without Shippo, USPS alone prices it (USPS_CLIENT_ID and USPS_CLIENT_SECRET,
  // Ground Advantage at mailClass/priceType); with neither, or when they can't be reached, it's
  // shippingFlat. box: the shipping box, in inches.
  // customerShare: the part of the carrier's price the customer pays (0.5 = half; the shop pays
  // the rest), and never more than maxFee (also the shipping price Google is given for orders
  // under freeShippingOver). Internal: customers only see the price.
  postage: { customerShare: 0.5, maxFee: 5.95, autoLabels: true, maxDays: 3, mailClass: "USPS_GROUND_ADVANTAGE", priceType: "COMMERCIAL", box: { length: 9, width: 6, height: 4 } },
  // Where parcels ship from (shipping labels). Check the ZIP and add a phone: UPS and FedEx
  // require one on the label (Roastery House's phone is used when this is empty).
  shipFrom: {
    name: "Mimi Food",
    street1: "1415 Maple Ave Suite 220",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90015",
    country: "US",
    phone: "213-765-0382",
  },
  // Wholesale accounts: default discount off retail prices and payment terms (days).
  // Each account can override both in the back office.
  // Wholesale: each account's discount off shop prices, payment terms (days), the 5 lb bag (priced
  // from the 1kg price per kilo), and the minimums beyond localMiles of the roastery: bulk bags
  // (5 lb coffee, 1 kg tea), and retail items for resale (250g bags and tea packs). priceFactor
  // applies after the account's discount: 0.5 halves every wholesale price. 1 kg of loose tea is
  // its pack's shop price × teaKg, less teaKgOff, for every account.
  // Wholesale prospects (back office, Wholesale → Prospects): points for each fit signal, out of
  // 100. A signal only counts with a fact and its source behind it.
  prospectWeights: { category: 25, program: 20, specialty: 20, potential: 15, contact: 10, territory: 10 },
  wholesale: { discount: 0.3, priceFactor: 0.5, teaKg: 2.5, teaKgOff: 0.15, terms: 30, bulkKg: 2.268, localMiles: 50, minimums: { bulk: 4, retail: 12 } },
  // Newsletter signups get a one-time code for this much off (percent), valid for welcomeDays.
  // 0 turns it off. Signed-in customers with an active subscription get subscriberDiscount
  // (percent) off coffee in the shop; it doesn't stack with a code (the better one counts).
  welcomeDiscount: 15,
  welcomeDays: 30,
  subscriberDiscount: 15,
  // Packed shipping weight in ounces (coffee + bag), plus the box. Editable per label.
  shippingWeightOz: { "250g": 10, "500g": 19, "1kg": 38, box: 4 },
  // false hides the espresso pour bars from the shop until they open: Locations, Order Ahead,
  // their menu links, the ticker line and FAQ entry, and café orders at checkout. The back
  // office (menu, locations, café orders) keeps working, so everything can be set up first.
  // This is only the starting value: the "Go live" button on the back office Café menu page
  // switches it, and that choice is kept across deploys.
  cafesLive: false,
  // The online shop is open: Cart, Add buttons, checkout, the chat's checkout and the product
  // feeds. false closes it (no Cart anywhere, add buttons do nothing, checkout sends people back
  // to the shop); ?preview=shop on any page then tries it in that browser (?preview=off to stop).
  shopLive: true,
  // Return labels by mail: the carrier is chosen on what the label costs plus the customer's trip
  // to its nearest drop-off, at perMile dollars for each mile past freeMiles (server/dropoff.ts).
  returnChoice: { perMile: 0.75, freeMiles: 1 },
  ticker: [
    "Korean sauces and seasonings",
    "Free shipping over $60",
  ],
};

// `type` drives the shop filter. `color` is the bag label colour.
// Optional `image` (e.g. "assets/coffee-kenya.jpg") replaces the drawn bag with your photo.
// Prices are for 250g; 1kg is priced in `price1kg`.
const PRODUCTS: any[] = [];

// Accessories: sold alongside the coffee, shipped with it, and counted toward free shipping.
// `sizes` (optional) are the choices on its page, e.g. a tee's sizes; `colors` (optional) are
// colourways, each with its own photo (a cut-out on a clear background, standing on the tile's
// shadow like a bag). Without a photo, `art` draws it ("tee" or "dripper") in `color`. `weightOz` is its
// packed weight for shipping labels. Prices and descriptions are placeholders to set.
const ACCESSORIES: any[] = [
  {
    "id": "abbey-chili-sauce",
    "shopify": "49194530439461",
    "name": "Abbey Chili Sauce",
    "short": "Abbey Chili Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/01-abbey-chili-sauce.webp",
    "about": "Abbey Chili Sauce from Mimi Food."
  },
  {
    "id": "barbecue-sauce",
    "shopify": "49175099965733",
    "name": "Barbecue Sauce",
    "short": "Barbecue Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/02-barbecue-sauce.webp",
    "about": "Barbecue Sauce from Mimi Food."
  },
  {
    "id": "barbecue-sauce-1",
    "shopify": "49175278944549",
    "name": "Barbecue Sauce",
    "short": "Barbecue Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/03-barbecue-sauce-1.webp",
    "about": "Barbecue Sauce from Mimi Food."
  },
  {
    "id": "barbecue-sauce-2",
    "shopify": "49257057091877",
    "name": "Barbecue Sauce",
    "short": "Barbecue Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/04-barbecue-sauce-2.webp",
    "about": "Barbecue Sauce from Mimi Food."
  },
  {
    "id": "beef-bone-broth-vegetable-powder",
    "shopify": "49194466967845",
    "name": "Beef Bone Broth Vegetable Powder",
    "short": "Beef Bone Broth Vegetable Powder",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/05-beef-bone-broth-vegetable-po.webp",
    "about": "Beef Bone Broth Vegetable Powder from Mimi Food."
  },
  {
    "id": "bibimbap-red-pepper-sauce",
    "shopify": "49257060270373",
    "name": "Bibimbap Red Pepper Sauce",
    "short": "Bibimbap Red Pepper Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/06-bibimbap-red-pepper-sauce.webp",
    "about": "Bibimbap Red Pepper Sauce from Mimi Food."
  },
  {
    "id": "braised-chicken-family-sauce",
    "shopify": "49175276486949",
    "name": "Braised Chicken Family Sauce",
    "short": "Braised Chicken Family Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/07-braised-chicken-family-sauce.webp",
    "about": "Braised Chicken Family Sauce from Mimi Food."
  },
  {
    "id": "brown-sauce",
    "shopify": "49175238410533",
    "name": "Brown Sauce",
    "short": "Brown Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/08-brown-sauce.webp",
    "about": "Brown Sauce from Mimi Food."
  },
  {
    "id": "built-beef-stir-sauce",
    "shopify": "49175123460389",
    "name": "Built Beef Stir Sauce",
    "short": "Built Beef Stir Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/09-built-beef-stir-sauce.webp",
    "about": "Built Beef Stir Sauce from Mimi Food."
  },
  {
    "id": "built-roast-beef-dip-sauce",
    "shopify": "49175285236005",
    "name": "Built Roast Beef Dip Sauce",
    "short": "Built Roast Beef Dip Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/10-built-roast-beef-dip-sauce.webp",
    "about": "Built Roast Beef Dip Sauce from Mimi Food."
  },
  {
    "id": "chicken-barbecue-sauce",
    "shopify": "49175259545893",
    "name": "Chicken Barbecue Sauce",
    "short": "Chicken Barbecue Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/11-chicken-barbecue-sauce.webp",
    "about": "Chicken Barbecue Sauce from Mimi Food."
  },
  {
    "id": "duck-meat-stir-sauce",
    "shopify": "49175126278437",
    "name": "Duck Meat Stir Sauce",
    "short": "Duck Meat Stir Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/12-duck-meat-stir-sauce.webp",
    "about": "Duck Meat Stir Sauce from Mimi Food."
  },
  {
    "id": "french-dressing",
    "shopify": "49194549870885",
    "name": "French Dressing",
    "short": "French Dressing",
    "category": "Dressings",
    "price": 7.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/13-french-dressing.webp",
    "about": "French Dressing from Mimi Food."
  },
  {
    "id": "fried-chicken-sauce-1",
    "shopify": "49175270818085",
    "name": "Fried Chicken Sauce",
    "short": "Fried Chicken Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/14-fried-chicken-sauce-1.webp",
    "about": "Fried Chicken Sauce from Mimi Food."
  },
  {
    "id": "fried-chicken-sauce-2",
    "shopify": "49257065447717",
    "name": "Fried Chicken Sauce",
    "short": "Fried Chicken Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/15-fried-chicken-sauce-2.webp",
    "about": "Fried Chicken Sauce from Mimi Food."
  },
  {
    "id": "fried-chicken-with-sweet-sour-sauce",
    "shopify": "49175261217061",
    "name": "Fried Chicken with Sweet & Sour Sauce",
    "short": "Fried Chicken with Sweet & Sour Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/16-fried-chicken-with-sweet-sou.webp",
    "about": "Fried Chicken with Sweet & Sour Sauce from Mimi Food."
  },
  {
    "id": "fruit-ripening-chicken-sauce",
    "shopify": "49175271244069",
    "name": "Fruit Ripening Chicken Sauce",
    "short": "Fruit Ripening Chicken Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/17-fruit-ripening-chicken-sauce.webp",
    "about": "Fruit Ripening Chicken Sauce from Mimi Food."
  },
  {
    "id": "garlic-sauce-seasoning",
    "shopify": "49175114809637",
    "name": "Garlic Sauce Seasoning",
    "short": "Garlic Sauce Seasoning",
    "category": "Seasonings",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/18-garlic-sauce-seasoning.webp",
    "about": "Garlic Sauce Seasoning from Mimi Food."
  },
  {
    "id": "hamburger-sauce",
    "shopify": "49175244341541",
    "name": "Hamburger Sauce",
    "short": "Hamburger Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/19-hamburger-sauce.webp",
    "about": "Hamburger Sauce from Mimi Food."
  },
  {
    "id": "honey-butter-powder",
    "shopify": "49079016390949",
    "name": "Honey Butter Powder",
    "short": "Honey Butter Powder",
    "category": "Seasonings",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/20-honey-butter-powder.webp",
    "about": "Honey Butter Powder from Mimi Food."
  },
  {
    "id": "honey-butter-powder-1",
    "shopify": "49257065578789",
    "name": "Honey Butter Powder",
    "short": "Honey Butter Powder",
    "category": "Seasonings",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/21-honey-butter-powder-1.webp",
    "about": "Honey Butter Powder from Mimi Food."
  },
  {
    "id": "hot-rice-cake-sauce",
    "shopify": "49257065677093",
    "name": "Hot Rice Cake Sauce",
    "short": "Hot Rice Cake Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/22-hot-rice-cake-sauce.webp",
    "about": "Hot Rice Cake Sauce from Mimi Food."
  },
  {
    "id": "japanese-noodle-soup-extract",
    "shopify": "49194573332773",
    "name": "Japanese Noodle Soup Extract",
    "short": "Japanese Noodle Soup Extract",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/23-japanese-noodle-soup-extract.webp",
    "about": "Japanese Noodle Soup Extract from Mimi Food."
  },
  {
    "id": "magic-soy-sauce",
    "shopify": "49257057059109",
    "name": "Magic Soy Sauce",
    "short": "Magic Soy Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/24-magic-soy-sauce.webp",
    "about": "Magic Soy Sauce from Mimi Food."
  },
  {
    "id": "spicy-pork-cutlet",
    "shopify": "49079005774117",
    "name": "Magic Soy Sauce",
    "short": "Magic Soy Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/25-spicy-pork-cutlet.webp",
    "about": "Magic Soy Sauce from Mimi Food."
  },
  {
    "id": "spicy-mala-tteokboki",
    "shopify": "49074044829989",
    "name": "Mala  Hot Rice Cake Sauce",
    "short": "Mala  Hot Rice Cake Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/26-spicy-mala-tteokboki.webp",
    "about": "Mala  Hot Rice Cake Sauce from Mimi Food."
  },
  {
    "id": "bbq-sauce",
    "shopify": "49079014424869",
    "name": "Mala BBQ Sauce",
    "short": "Mala BBQ Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/27-bbq-sauce.webp",
    "about": "Mala BBQ Sauce from Mimi Food."
  },
  {
    "id": "bibimbap",
    "shopify": "49079015080229",
    "name": "Mala Bibimbap Red Pepper Sauce",
    "short": "Mala Bibimbap Red Pepper Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/28-bibimbap.webp",
    "about": "Mala Bibimbap Red Pepper Sauce from Mimi Food."
  },
  {
    "id": "mala-chicken-burger",
    "shopify": "49147793146149",
    "name": "Mala Chicken Burger",
    "short": "Mala Chicken Burger",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/29-mala-chicken-burger.webp",
    "about": "Mala Chicken Burger from Mimi Food."
  },
  {
    "id": "mala-dandan-noodles",
    "shopify": "49148758720805",
    "name": "Mala Dandan Noodles",
    "short": "Mala Dandan Noodles",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/30-mala-dandan-noodles.webp",
    "about": "Mala Dandan Noodles from Mimi Food."
  },
  {
    "id": "mala-dumplings",
    "shopify": "49235340394789",
    "name": "Mala Dumplings",
    "short": "Mala Dumplings",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/31-mala-dumplings.webp",
    "about": "Mala Dumplings from Mimi Food."
  },
  {
    "id": "fried-chicken-sauce",
    "shopify": "49079012196645",
    "name": "Mala Fried Chicken Sauce",
    "short": "Mala Fried Chicken Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/32-fried-chicken-sauce.webp",
    "about": "Mala Fried Chicken Sauce from Mimi Food."
  },
  {
    "id": "bibimguksu",
    "shopify": "49079013212453",
    "name": "Mala Mixed Bibim Sauce",
    "short": "Mala Mixed Bibim Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/33-bibimguksu.webp",
    "about": "Mala Mixed Bibim Sauce from Mimi Food."
  },
  {
    "id": "spicy-jjamppong",
    "shopify": "49079001022757",
    "name": "Mala Noodles Hot Sauce",
    "short": "Mala Noodles Hot Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/34-spicy-jjamppong.webp",
    "about": "Mala Noodles Hot Sauce from Mimi Food."
  },
  {
    "id": "mala-shrimp",
    "shopify": "49235340558629",
    "name": "Mala Shrimp",
    "short": "Mala Shrimp",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/35-mala-shrimp.webp",
    "about": "Mala Shrimp from Mimi Food."
  },
  {
    "id": "spicy-mala-hot-pot-sauce",
    "shopify": "48874645651749",
    "name": "Mala Spicy Hot Pot Sauce",
    "short": "Mala Spicy Hot Pot Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/36-spicy-mala-hot-pot-sauce.webp",
    "about": "Mala Spicy Hot Pot Sauce from Mimi Food."
  },
  {
    "id": "spicy-mala-hot-pot",
    "shopify": "48874559111461",
    "name": "Mala Spicy Stir Fry Sauce",
    "short": "Mala Spicy Stir Fry Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/37-spicy-mala-hot-pot.webp",
    "about": "Mala Spicy Stir Fry Sauce from Mimi Food."
  },
  {
    "id": "spicy-rigotoni",
    "shopify": "49079004561701",
    "name": "Mala Sweet Hot Sauce",
    "short": "Mala Sweet Hot Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/38-spicy-rigotoni.webp",
    "about": "Mala Sweet Hot Sauce from Mimi Food."
  },
  {
    "id": "mala-tofu",
    "shopify": "49079124033829",
    "name": "Mala Tofu",
    "short": "Mala Tofu",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/39-mala-tofu.webp",
    "about": "Mala Tofu from Mimi Food."
  },
  {
    "id": "spicy-hot-tofu-stew",
    "shopify": "49079001940261",
    "name": "Mala Tofu Stew Sauce",
    "short": "Mala Tofu Stew Sauce",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/40-spicy-hot-tofu-stew.webp",
    "about": "Mala Tofu Stew Sauce from Mimi Food."
  },
  {
    "id": "mala-volcano-hot-pot",
    "shopify": "49079064920357",
    "name": "Mala Volcano Hot Pot",
    "short": "Mala Volcano Hot Pot",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/41-mala-volcano-hot-pot.webp",
    "about": "Mala Volcano Hot Pot from Mimi Food."
  },
  {
    "id": "mala-xiaolongxia",
    "shopify": "49148797976869",
    "name": "Mala Xiaolongxia",
    "short": "Mala Xiaolongxia",
    "category": "Mala",
    "price": 9.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/42-mala-xiaolongxia.webp",
    "about": "Mala Xiaolongxia from Mimi Food."
  },
  {
    "id": "miso-marinated-sauce",
    "shopify": "49175117168933",
    "name": "Miso Marinated Sauce",
    "short": "Miso Marinated Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/43-miso-marinated-sauce.webp",
    "about": "Miso Marinated Sauce from Mimi Food."
  },
  {
    "id": "mixed-bibim-sauce",
    "shopify": "49257097167141",
    "name": "Mixed Bibim Sauce",
    "short": "Mixed Bibim Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/44-mixed-bibim-sauce.webp",
    "about": "Mixed Bibim Sauce from Mimi Food."
  },
  {
    "id": "momil-buckwheat-noodle-soup-extract",
    "shopify": "49194577396005",
    "name": "Momil Buckwheat Noodle Soup Extract",
    "short": "Momil Buckwheat Noodle Soup Extract",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/45-momil-buckwheat-noodle-soup-.webp",
    "about": "Momil Buckwheat Noodle Soup Extract from Mimi Food."
  },
  {
    "id": "mustard-dressing",
    "shopify": "49194515366181",
    "name": "Mustard Dressing",
    "short": "Mustard Dressing",
    "category": "Dressings",
    "price": 7.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/46-mustard-dressing.webp",
    "about": "Mustard Dressing from Mimi Food."
  },
  {
    "id": "noodles-hot-sauce",
    "shopify": "49257097330981",
    "name": "Noodles Hot Sauce",
    "short": "Noodles Hot Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/47-noodles-hot-sauce.webp",
    "about": "Noodles Hot Sauce from Mimi Food."
  },
  {
    "id": "noodles-in-a-dish-sauce",
    "shopify": "49175266951461",
    "name": "Noodles in a Dish Sauce",
    "short": "Noodles in a Dish Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/48-noodles-in-a-dish-sauce.webp",
    "about": "Noodles in a Dish Sauce from Mimi Food."
  },
  {
    "id": "oriental-dressing",
    "shopify": "49194510909733",
    "name": "Oriental Dressing",
    "short": "Oriental Dressing",
    "category": "Dressings",
    "price": 7.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/49-oriental-dressing.webp",
    "about": "Oriental Dressing from Mimi Food."
  },
  {
    "id": "oyster-sauce",
    "shopify": "49175248208165",
    "name": "Oyster Sauce",
    "short": "Oyster Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/50-oyster-sauce.webp",
    "about": "Oyster Sauce from Mimi Food."
  },
  {
    "id": "pickle-dressing",
    "shopify": "49194511892773",
    "name": "Pickle Dressing",
    "short": "Pickle Dressing",
    "category": "Dressings",
    "price": 7.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/51-pickle-dressing.webp",
    "about": "Pickle Dressing from Mimi Food."
  },
  {
    "id": "pigs-feet-cold-plate-sauce",
    "shopify": "49175264198949",
    "name": "Pig's Feet Cold Plate Sauce",
    "short": "Pig's Feet Cold Plate Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/52-pigs-feet-cold-plate-sauce.webp",
    "about": "Pig's Feet Cold Plate Sauce from Mimi Food."
  },
  {
    "id": "ponzu-sauce",
    "shopify": "49175286284581",
    "name": "Ponzu Sauce",
    "short": "Ponzu Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/53-ponzu-sauce.webp",
    "about": "Ponzu Sauce from Mimi Food."
  },
  {
    "id": "pork-cutlet-sauce",
    "shopify": "49175238279461",
    "name": "Pork Cutlet Sauce",
    "short": "Pork Cutlet Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/54-pork-cutlet-sauce.webp",
    "about": "Pork Cutlet Sauce from Mimi Food."
  },
  {
    "id": "powdered-soup-for-eomuk-udong",
    "shopify": "49194460545317",
    "name": "Powdered Soup for Eomuk & Udong",
    "short": "Powdered Soup for Eomuk & Udong",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/55-powdered-soup-for-eomuk-udon.webp",
    "about": "Powdered Soup for Eomuk & Udong from Mimi Food."
  },
  {
    "id": "powdered-soup-for-gamjatang",
    "shopify": "49194443014437",
    "name": "Powdered Soup for Gamjatang",
    "short": "Powdered Soup for Gamjatang",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/56-powdered-soup-for-gamjatang.webp",
    "about": "Powdered Soup for Gamjatang from Mimi Food."
  },
  {
    "id": "powdered-soup-for-guksu",
    "shopify": "49194448355621",
    "name": "Powdered Soup for Guksu",
    "short": "Powdered Soup for Guksu",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/57-powdered-soup-for-guksu.webp",
    "about": "Powdered Soup for Guksu from Mimi Food."
  },
  {
    "id": "powdered-soup-for-kongguksu",
    "shopify": "49194447470885",
    "name": "Powdered Soup for Kongguksu",
    "short": "Powdered Soup for Kongguksu",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/58-powdered-soup-for-kongguksu.webp",
    "about": "Powdered Soup for Kongguksu from Mimi Food."
  },
  {
    "id": "powdered-soup-for-makguksu",
    "shopify": "49194451009829",
    "name": "Powdered Soup for Makguksu",
    "short": "Powdered Soup for Makguksu",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/59-powdered-soup-for-makguksu.webp",
    "about": "Powdered Soup for Makguksu from Mimi Food."
  },
  {
    "id": "powdered-soup-for-mul-naengmyeon",
    "name": "Powdered Soup for Mul Naengmyeon",
    "short": "Powdered Soup for Mul Naengmyeon",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/60-powdered-soup-for-mul-naengm.webp",
    "about": "Powdered Soup for Mul Naengmyeon from Mimi Food."
  },
  {
    "id": "powdered-soup-for-sujebi",
    "shopify": "49194458808613",
    "name": "Powdered Soup for Sujebi",
    "short": "Powdered Soup for Sujebi",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/61-powdered-soup-for-sujebi.webp",
    "about": "Powdered Soup for Sujebi from Mimi Food."
  },
  {
    "id": "sauce-seasoned-with-gochujang",
    "shopify": "49175111139621",
    "name": "Sauce Seasoned with Gochujang",
    "short": "Sauce Seasoned with Gochujang",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/62-sauce-seasoned-with-gochujan.webp",
    "about": "Sauce Seasoned with Gochujang from Mimi Food."
  },
  {
    "id": "sauce-seasoned-with-gochujang-gopchang",
    "shopify": "49175140073765",
    "name": "Sauce Seasoned with Gochujang (Gopchang)",
    "short": "Sauce Seasoned with Gochujang (Gopchang)",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/63-sauce-seasoned-with-gochujan.webp",
    "about": "Sauce Seasoned with Gochujang (Gopchang) from Mimi Food."
  },
  {
    "id": "seasoned-minced-beef-sauce",
    "shopify": "49175284973861",
    "name": "Seasoned Minced Beef Sauce",
    "short": "Seasoned Minced Beef Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/64-seasoned-minced-beef-sauce.webp",
    "about": "Seasoned Minced Beef Sauce from Mimi Food."
  },
  {
    "id": "seasoned-sauce-for-beef-wine",
    "shopify": "49175280976165",
    "name": "Seasoned Sauce for Beef ( Wine)",
    "short": "Seasoned Sauce for Beef ( Wine)",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/65-seasoned-sauce-for-beef-wine.webp",
    "about": "Seasoned Sauce for Beef ( Wine) from Mimi Food."
  },
  {
    "id": "seasoned-sauce-for-beef-garlic-g",
    "shopify": "49175279337765",
    "name": "Seasoned Sauce for Beef (Garlic G)",
    "short": "Seasoned Sauce for Beef (Garlic G)",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/66-seasoned-sauce-for-beef-garl.webp",
    "about": "Seasoned Sauce for Beef (Garlic G) from Mimi Food."
  },
  {
    "id": "spicy-chicken-seasoning-sauce",
    "shopify": "49175147774245",
    "name": "Spicy Chicken Seasoning Sauce",
    "short": "Spicy Chicken Seasoning Sauce",
    "category": "Seasonings",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/67-spicy-chicken-seasoning-sauc.webp",
    "about": "Spicy Chicken Seasoning Sauce from Mimi Food."
  },
  {
    "id": "spicy-seasoning-powder",
    "shopify": "49194457432357",
    "name": "Spicy Seasoning Powder",
    "short": "Spicy Seasoning Powder",
    "category": "Seasonings",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/68-spicy-seasoning-powder.webp",
    "about": "Spicy Seasoning Powder from Mimi Food."
  },
  {
    "id": "sriracha-hot-sauce",
    "shopify": "49175256039717",
    "name": "Sriracha Hot Sauce",
    "short": "Sriracha Hot Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/69-sriracha-hot-sauce.webp",
    "about": "Sriracha Hot Sauce from Mimi Food."
  },
  {
    "id": "steak-sauce",
    "shopify": "49175242408229",
    "name": "Steak Sauce",
    "short": "Steak Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/70-steak-sauce.webp",
    "about": "Steak Sauce from Mimi Food."
  },
  {
    "id": "steamed-seafood-sauce",
    "shopify": "49175142072613",
    "name": "Steamed Seafood Sauce",
    "short": "Steamed Seafood Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/71-steamed-seafood-sauce.webp",
    "about": "Steamed Seafood Sauce from Mimi Food."
  },
  {
    "id": "sweet-sour-pork-sauce",
    "shopify": "49175250043173",
    "name": "Sweet & Sour Pork Sauce",
    "short": "Sweet & Sour Pork Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/72-sweet-sour-pork-sauce.webp",
    "about": "Sweet & Sour Pork Sauce from Mimi Food."
  },
  {
    "id": "sweet-sour-red-pepper-paste",
    "shopify": "49175111860517",
    "name": "Sweet & Sour Red Pepper Paste",
    "short": "Sweet & Sour Red Pepper Paste",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/73-sweet-sour-red-pepper-paste.webp",
    "about": "Sweet & Sour Red Pepper Paste from Mimi Food."
  },
  {
    "id": "sweet-chili-sauce",
    "shopify": "49194519134501",
    "name": "Sweet Chili Sauce",
    "short": "Sweet Chili Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/74-sweet-chili-sauce.webp",
    "about": "Sweet Chili Sauce from Mimi Food."
  },
  {
    "id": "sweet-hot-sauce",
    "shopify": "49257097363749",
    "name": "Sweet Hot Sauce",
    "short": "Sweet Hot Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/75-sweet-hot-sauce.webp",
    "about": "Sweet Hot Sauce from Mimi Food."
  },
  {
    "id": "tartar-dressing",
    "shopify": "49194513269029",
    "name": "Tartar Dressing",
    "short": "Tartar Dressing",
    "category": "Dressings",
    "price": 7.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/76-tartar-dressing.webp",
    "about": "Tartar Dressing from Mimi Food."
  },
  {
    "id": "teriyaki-sauce",
    "shopify": "49175272456485",
    "name": "Teriyaki Sauce",
    "short": "Teriyaki Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/77-teriyaki-sauce.webp",
    "about": "Teriyaki Sauce from Mimi Food."
  },
  {
    "id": "tofu-stew-sauce",
    "shopify": "49257097396517",
    "name": "Tofu Stew Sauce",
    "short": "Tofu Stew Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/78-tofu-stew-sauce.webp",
    "about": "Tofu Stew Sauce from Mimi Food."
  },
  {
    "id": "vegetable-sweet-dressing",
    "shopify": "49194514252069",
    "name": "Vegetable Sweet Dressing",
    "short": "Vegetable Sweet Dressing",
    "category": "Dressings",
    "price": 7.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/79-vegetable-sweet-dressing.webp",
    "about": "Vegetable Sweet Dressing from Mimi Food."
  },
  {
    "id": "water-cold-noodle-sauce",
    "shopify": "49175101112613",
    "name": "Water Cold Noodle Sauce",
    "short": "Water Cold Noodle Sauce",
    "category": "Sauces",
    "price": 8.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/80-water-cold-noodle-sauce.webp",
    "about": "Water Cold Noodle Sauce from Mimi Food."
  },
  {
    "id": "watery-buckwheat-noodle-soup-extract",
    "shopify": "49194575397157",
    "name": "Watery Buckwheat Noodle Soup Extract",
    "short": "Watery Buckwheat Noodle Soup Extract",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/81-watery-buckwheat-noodle-soup.webp",
    "about": "Watery Buckwheat Noodle Soup Extract from Mimi Food."
  },
  {
    "id": "wheat-flour-noodles-in-a-light-seaweed-broth-extract",
    "shopify": "49194569433381",
    "name": "Wheat Flour Noodles in a Light Seaweed Broth Extract",
    "short": "Wheat Flour Noodles in a Light Seaweed Broth Extract",
    "category": "Soups & Broths",
    "price": 6.99,
    "color": "#f4f2ee",
    "weightOz": 14,
    "image": "/assets/products/82-wheat-flour-noodles-in-a-lig.webp",
    "about": "Wheat Flour Noodles in a Light Seaweed Broth Extract from Mimi Food."
  },
  {"id":"spicy-mayo-sauce","name":"Spicy Mayo Sauce","short":"Spicy Mayo Sauce","category":"Sauces","price":23,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/83-spicy-mayo-sauce.webp","labels":["Popular"],"about":"Spicy Mayo Sauce from Mimi Food."},
  {"id":"bling-spicy-mayo-sauce","name":"Bling Spicy Mayo Sauce","short":"Bling Spicy Mayo Sauce","category":"Sauces","price":23,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/84-bling-spicy-mayo-sauce.webp","about":"Bling Spicy Mayo Sauce from Mimi Food."},
  {"id":"korean-fried-chicken-honey-soy-garlic-sa","name":"Korean Fried Chicken Honey Soy Garlic Sauce","short":"Korean Fried Chicken Honey Soy Garlic Sauce","category":"Sauces","price":29,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/85-korean-fried-chicken-honey-s.webp","labels":["Best Seller"],"about":"Korean Fried Chicken Honey Soy Garlic Sauce from Mimi Food."},
  {"id":"grilled-hot-sauce","name":"Grilled Hot Sauce","short":"Grilled Hot Sauce","category":"Sauces","price":23,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/86-grilled-hot-sauce.webp","about":"Grilled Hot Sauce from Mimi Food."},
  {"id":"korean-fried-chicken-volcano-spicy-sauce","name":"Korean Fried Chicken Volcano Spicy Sauce","short":"Korean Fried Chicken Volcano Spicy Sauce","category":"Sauces","price":29,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/87-korean-fried-chicken-volcano.webp","labels":["Hot & Spicy"],"about":"Korean Fried Chicken Volcano Spicy Sauce from Mimi Food."},
  {"id":"tteokbokki-spicy-rice-cake-sauce","name":"Tteokbokki Spicy Rice Cake Sauce","short":"Tteokbokki Spicy Rice Cake Sauce","category":"Sauces","price":27,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/88-tteokbokki-spicy-rice-cake-s.webp","about":"Tteokbokki Spicy Rice Cake Sauce from Mimi Food."},
  {"id":"mala-mayo-sauce","name":"Mala Mayo Sauce","short":"Mala Mayo Sauce","category":"Sauces","price":18,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/89-mala-mayo-sauce.webp","labels":["New"],"about":"Mala Mayo Sauce from Mimi Food."},
  {"id":"tofu-stew-sauce-2","name":"Tofu Stew Sauce","short":"Tofu Stew Sauce","category":"Sauces","price":23,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/90-tofu-stew-sauce.webp","about":"Tofu Stew Sauce from Mimi Food."},
  {"id":"bulgogi-sauce","name":"Bulgogi Sauce","short":"Bulgogi Sauce","category":"Sauces","price":29,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/91-bulgogi-sauce.webp","about":"Bulgogi Sauce from Mimi Food."},
  {"id":"pork-cutlet-sauce-2","name":"Pork Cutlet Sauce","short":"Pork Cutlet Sauce","category":"Sauces","price":25,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/92-pork-cutlet-sauce.webp","about":"Pork Cutlet Sauce from Mimi Food."},
  {"id":"jumulleok-seasoning-sauce","name":"Jumulleok Seasoning Sauce","short":"Jumulleok Seasoning Sauce","category":"Sauces","price":23,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/93-jumulleok-seasoning-sauce.webp","about":"Jumulleok Seasoning Sauce from Mimi Food."},
  {"id":"korean-beef-short-rib-galbi-marinade-sau","name":"Korean Beef Short Rib Galbi Marinade Sauce (2kg)","short":"Korean Beef Short Rib Galbi Marinade Sauce (2kg)","category":"Sauces","price":35,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/94-korean-beef-short-rib-galbi-.webp","about":"Korean Beef Short Rib Galbi Marinade Sauce (2kg) from Mimi Food."},
  {"id":"korean-fried-chicken-soy-garlic-sauce","name":"Korean Fried Chicken Soy Garlic Sauce","short":"Korean Fried Chicken Soy Garlic Sauce","category":"Sauces","price":29,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/95-korean-fried-chicken-soy-gar.webp","about":"Korean Fried Chicken Soy Garlic Sauce from Mimi Food."},
  {"id":"korean-fried-chicken-legendary-spicy-sau","name":"Korean Fried Chicken Legendary Spicy Sauce","short":"Korean Fried Chicken Legendary Spicy Sauce","category":"Sauces","price":45,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/96-korean-fried-chicken-legenda.webp","about":"Korean Fried Chicken Legendary Spicy Sauce from Mimi Food."},
  {"id":"korean-fried-chicken-sweet-and-spicy-sau","name":"Korean Fried Chicken Sweet & Spicy Sauce","short":"Korean Fried Chicken Sweet & Spicy Sauce","category":"Sauces","price":45,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/97-korean-fried-chicken-sweet-a.webp","about":"Korean Fried Chicken Sweet & Spicy Sauce from Mimi Food."},
  {"id":"star-sauce","name":"Star Sauce","short":"Star Sauce","category":"Sauces","price":43,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/98-star-sauce.webp","about":"Star Sauce from Mimi Food."},
  {"id":"mala-stir-fry-sauce","name":"Mala Stir Fry Sauce","short":"Mala Stir Fry Sauce","category":"Mala","price":4,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/99-mala-stir-fry-sauce.webp","about":"Mala Stir Fry Sauce from Mimi Food."},
  {"id":"mala-spicy-hot-pot-soup-base","name":"Mala Spicy Hot Pot Soup Base","short":"Mala Spicy Hot Pot Soup Base","category":"Mala","price":4,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/100-mala-spicy-hot-pot-soup-base.webp","about":"Mala Spicy Hot Pot Soup Base from Mimi Food."},
  {"id":"korean-honey-butter-powder","name":"Korean Honey Butter Powder","short":"Korean Honey Butter Powder","category":"Seasonings","price":27,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/101-korean-honey-butter-powder.webp","about":"Korean Honey Butter Powder from Mimi Food."},
  {"id":"mimi-food-miracle-powder","name":"Mimi Food Miracle Powder","short":"Mimi Food Miracle Powder","category":"Seasonings","price":37,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/102-mimi-food-miracle-powder.webp","about":"Mimi Food Miracle Powder from Mimi Food."},
  {"id":"b-max-all-purpose-seasoned-batter-flour","name":"B-MAX All Purpose Seasoned Batter Flour","short":"B-MAX All Purpose Seasoned Batter Flour","category":"Batter Flour","price":37,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/103-b-max-all-purpose-seasoned-b.webp","about":"B-MAX All Purpose Seasoned Batter Flour from Mimi Food."},
  {"id":"c-max-all-purpose-seasoned-batter-flour","name":"C-MAX All Purpose Seasoned Batter Flour","short":"C-MAX All Purpose Seasoned Batter Flour","category":"Batter Flour","price":37,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/104-c-max-all-purpose-seasoned-b.webp","about":"C-MAX All Purpose Seasoned Batter Flour from Mimi Food."},
  {"id":"melon-soy-milk","name":"Melon Soy Milk","short":"Melon Soy Milk","category":"Soy Milk","price":13,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/105-melon-soy-milk.webp","about":"Melon Soy Milk from Mimi Food."},
  {"id":"korean-whole-oat-milk-original","name":"Korean Whole Oat Milk – Original","short":"Korean Whole Oat Milk – Original","category":"Soy Milk","price":13,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/106-korean-whole-oat-milk-origin.webp","about":"Korean Whole Oat Milk – Original from Mimi Food."},
  {"id":"nature-seven-whole-oat-almond-soy-milk","name":"Nature Seven Whole Oat Almond Soy Milk","short":"Nature Seven Whole Oat Almond Soy Milk","category":"Soy Milk","price":13,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/107-nature-seven-whole-oat-almon.webp","about":"Nature Seven Whole Oat Almond Soy Milk from Mimi Food."},
  {"id":"beet-tea","name":"Beet Tea","short":"Beet Tea","category":"Teas","price":10,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/108-beet-tea.webp","about":"Beet Tea from Mimi Food."},
  {"id":"bitter-melon-tea","name":"Bitter Melon Tea","short":"Bitter Melon Tea","category":"Teas","price":10,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/109-bitter-melon-tea.webp","about":"Bitter Melon Tea from Mimi Food."},
  {"id":"ginko-nut-tea","name":"Ginko Nut Tea","short":"Ginko Nut Tea","category":"Teas","price":10,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/110-ginko-nut-tea.webp","about":"Ginko Nut Tea from Mimi Food."},
  {"id":"sword-bean-tea","name":"Sword Bean Tea","short":"Sword Bean Tea","category":"Teas","price":10,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/111-sword-bean-tea.webp","about":"Sword Bean Tea from Mimi Food."},
  {"id":"pumpkin-and-red-bean-tea","name":"Pumpkin & Red Bean Tea","short":"Pumpkin & Red Bean Tea","category":"Teas","price":10,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/112-pumpkin-and-red-bean-tea.webp","about":"Pumpkin & Red Bean Tea from Mimi Food."},
  {"id":"jerusalem-artichoke-tea","name":"Jerusalem Artichoke Tea","short":"Jerusalem Artichoke Tea","category":"Teas","price":10,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/113-jerusalem-artichoke-tea.webp","about":"Jerusalem Artichoke Tea from Mimi Food."},
  {"id":"misugaru-powder","name":"Misugaru Powder","short":"Misugaru Powder","category":"Teas","price":17,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/114-misugaru-powder.webp","about":"Misugaru Powder from Mimi Food."},
  {"id":"cordyceps-tea","name":"Cordyceps Tea","short":"Cordyceps Tea","category":"Teas","price":17,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/115-cordyceps-tea.webp","about":"Cordyceps Tea from Mimi Food."},
  {"id":"tea-of-tranquility","name":"Tea of Tranquility","short":"Tea of Tranquility","category":"Teas","price":17,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/116-tea-of-tranquility.webp","about":"Tea of Tranquility from Mimi Food."},
  {"id":"nurungji-scorched-rice-tea","name":"Nurungji (Scorched Rice) Tea","short":"Nurungji (Scorched Rice) Tea","category":"Teas","price":17,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/117-nurungji-scorched-rice-tea.webp","about":"Nurungji (Scorched Rice) Tea from Mimi Food."},
  {"id":"cassia-seed-tea","name":"Cassia Seed Tea","short":"Cassia Seed Tea","category":"Teas","price":17,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/118-cassia-seed-tea.webp","about":"Cassia Seed Tea from Mimi Food."},
  {"id":"red-ginseng-sword-bean-tea-for-growing-c","name":"Red Ginseng Sword Bean Tea for Growing Children","short":"Red Ginseng Sword Bean Tea for Growing Children","category":"Teas","price":17,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/119-red-ginseng-sword-bean-tea-f.webp","about":"Red Ginseng Sword Bean Tea for Growing Children from Mimi Food."},
  {"id":"hankook-tea-powdered-green-tea","name":"Hankook Tea - Powdered Green Tea","short":"Hankook Tea - Powdered Green Tea","category":"Teas","price":95,"color":"#f4f2ee","weightOz":32,"image":"/assets/products/120-hankook-tea-powdered-green-t.webp","about":"Hankook Tea - Powdered Green Tea from Mimi Food."},
  {"id":"chomi-avali-essential-mask-10-sheets","name":"Chomi Avali Essential Mask 10 Sheets","short":"Chomi Avali Essential Mask 10 Sheets","category":"Skincare","price":null,"color":"#f4f2ee","weightOz":6,"image":"/assets/products/121-chomi-avali-essential-mask-1.webp","about":"Chomi Avali Essential Mask 10 Sheets from Mimi Food."},
  {"id":"chomi-avali-balm-calming-cream-50ml","name":"Chomi Avali Balm Calming Cream 50ml","short":"Chomi Avali Balm Calming Cream 50ml","category":"Skincare","price":null,"color":"#f4f2ee","weightOz":6,"image":"/assets/products/122-chomi-avali-balm-calming-cre.webp","about":"Chomi Avali Balm Calming Cream 50ml from Mimi Food."},
  {"id":"seven-way-moisture-lotion","name":"Seven-Way Moisture Lotion","short":"Seven-Way Moisture Lotion","category":"Skincare","price":11.99,"color":"#f4f2ee","weightOz":6,"image":"/assets/products/123-seven-way-moisture-lotion.webp","about":"Seven-Way Moisture Lotion from Mimi Food."},
  {"id":"black-caviar-mineral-soap","name":"Black Caviar Mineral Soap","short":"Black Caviar Mineral Soap","category":"Skincare","price":7.99,"color":"#f4f2ee","weightOz":6,"image":"/assets/products/124-black-caviar-mineral-soap.webp","about":"Black Caviar Mineral Soap from Mimi Food."},
  {"id":"obeo-evolution-kwangsu-skin-bar","name":"Obeo Evolution Kwangsu Skin Bar","short":"Obeo Evolution Kwangsu Skin Bar","category":"Skincare","price":7.99,"color":"#f4f2ee","weightOz":6,"image":"/assets/products/125-obeo-evolution-kwangsu-skin-.webp","about":"Obeo Evolution Kwangsu Skin Bar from Mimi Food."}
];
// Where our coffees grow, for the origins map in Numeral posts (content/maps/coffee-origins.svg):
// the spot on the map in % (from scripts/build-maps.mjs) and the coffees (ids) from there. A
// coffee that's hidden or gone from the shop is skipped.
const COFFEE_REGIONS: any[] = [
  { id: "cauca-huila", name: "Cauca and Huila", country: "Colombia", x: 12.1, y: 31.9, products: ["san-antonio", "decaf-colombia", "house-blend"] },
  { id: "caranavi", name: "Caranavi", country: "Bolivia", x: 17.6, y: 49.3, products: ["finca-la-asunta"] },
  { id: "chapada", name: "Chapada Diamantina", country: "Brazil", x: 35.1, y: 46.2, products: ["sao-judas-tadeu", "house-blend"] },
  { id: "sidama", name: "Bensa, Sidama", country: "Ethiopia", x: 88.4, y: 27.9, products: ["ayla-bombe-washed", "ayla-bombe-natural"] },
  { id: "kirinyaga", name: "Kirinyaga", country: "Kenya", x: 87.5, y: 34.6, products: ["muhathi-estate"] },
];

// The kinds of tea, in the order the shop's Tea filters show them (only kinds with a tea in the
// shop appear). Each tea has a `type` from this list, and may name its `cultivar` (an id in js/tea.js).
const TEA_TYPES = ["Green", "Matcha", "White & Yellow", "Oolong", "Black", "Puerh", "Herbal"];
// Tea is sold with the accessories (same cart line) but is its own section and is food.
const isTea = (a) => a?.category === "Tea";
// Not on sale yet: no price set.
const comingSoon = (a) => a?.price == null;

// Brew recipes shown on each coffee's page, by coffee type (and each tea's, as "Tea").
// Every tea's picture unless the back office gives it its own: the plain cup, cut out.
const TEA_CUP_PHOTO = "/assets/teas/cup.webp";

const BREW_GUIDES: any = {
  Tea: {
    title: "In the cup",
    steps: [["Tea", "One cup (4g, already in it)"], ["Water", "About 150ml"], ["Temperature", "90–100°C"], ["Steep", "1 minute"]],
  },
  Espresso: {
    title: "Espresso",
    steps: [["Dose", "18g"], ["Yield", "40g"], ["Time", "28–32 seconds"], ["Temperature", "93°C"]],
    tip: "Rest the beans 7–10 days after roasting for the sweetest shots.",
  },
  Filter: {
    title: "Pour over",
    steps: [["Ratio", "15g coffee : 250g water"], ["Grind", "Medium-fine"], ["Temperature", "94°C"], ["Brew time", "About 3 minutes"]],
    tip: "Bloom with 40g of water for 30 seconds, then pour slowly in circles.",
  },
};

// We roast light, for filter or for espresso: a coffee's `type` is its roast. It's sold as
// whole beans, or ground the way that roast is meant to be brewed (a filter roast for filter,
// an espresso roast for espresso), never anything else. `ground: false` sells it as whole
// beans only. The server checks orders against this too.
const ROAST_TYPES = ["Espresso", "Filter"];
// The day a local courier delivery goes out, in the shop's time zone: { date: "2026-10-15",
// today: true, cutoff: "5:30 PM" } today when there's time, else the next day Roastery House opens,
// picked up at morningPickup ({ today: false, pickup: "7:00 AM" }).
function courierDay(now = new Date()) {
  const tz = SITE.timezone || "America/Los_Angeles";
  const from = LOCATIONS.find((l) => l.id === (SITE.localDelivery?.from || "roastery")) || LOCATIONS[0];
  const lead = SITE.localDelivery?.sameDayMinutes ?? 30;
  const morning = SITE.localDelivery?.morningPickup || "07:00";
  const parts = (d) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(d).map((p) => [p.type, p.value]));
  const p = parts(now);
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const clock = (m) => new Date(Date.UTC(2000, 0, 1, Math.floor(m / 60), m % 60)).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const today = from?.hours?.[dow];
  if (today && minutes <= toMin(today[1]) - lead) return { date: `${p.year}-${p.month}-${p.day}`, today: true, cutoff: clock(toMin(today[1]) - lead) };
  for (let i = 1; i <= 7; i++) {
    const day = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + i, 12));
    if (from?.hours?.[day.getUTCDay()]) return { date: day.toISOString().slice(0, 10), today: false, tomorrow: i === 1, pickup: clock(toMin(morning)) };
  }
  return { date: `${p.year}-${p.month}-${p.day}`, today: true };
}

// A parcel's packed weight in ounces: each bag by its size, each accessory by its own weight,
// plus the box. Checkout and the server both price postage by it.
function parcelOz(lines) {
  const w = SITE.shippingWeightOz;
  const accessoryOz = (id) => ACCESSORIES.find((a) => a.id === id)?.weightOz ?? 0;
  const each = (l) =>
    l.kind === "accessory" ? l.weightOz ?? accessoryOz(l.product) : /^t:/.test(l.sub?.coffee || "") ? accessoryOz(l.sub.coffee.slice(2)) : w[l.sub?.size || String(l.variant || "").split(" ")[0]] || w["250g"];
  const oz = lines.filter((l) => l.kind !== "pickup" && l.kind !== "class" && l.kind !== "giftcard").reduce((n, l) => n + l.qty * each(l), 0);
  return oz ? oz + w.box : 0;
}

// The tax class of a line, as states group goods: coffee is groceries, a tee is clothing, other
// accessories are general goods, café items are prepared food. Subscriptions billed later and
// class seats aren't taxed here (null).
function taxClass(l) {
  if (l.kind === "coffee" || l.kind === "prepaid" || (l.kind === "sub" && l.sub?.prepaid)) return "groceries";
  if (l.kind === "accessory") {
    const category = l.category || ACCESSORIES.find((a) => a.id === l.product)?.category;
    // Packaged food is groceries (not taxed in California); skincare and anything else is general goods.
    return category === "Apparel" ? "clothing" : category === "Skincare" ? "general" : "groceries";
  }
  if (l.kind === "pickup") return "prepared_food";
  return null;
}

// Sales tax on `lines` at `rates` (a rate per tax class, for where they go): each line on its
// price less its share of the order's discount (shared by price across the order's lines that
// aren't subscriptions, `pool`, the way Square shares it), rounded to the cent per line.
// Checkout and the server both use it.
// on: the lines the discount came off, so it's taken off the same ones here: "coffee" for the
// subscriber discount (coffee bags only), else a code's (not subscriptions, prepaid gifts or gift
// cards).
function salesTaxFor(lines, { discount = 0, rates = null, pool = lines, on = "code" }: { discount?: number; rates?: any; pool?: any[]; on?: string } = {}) {
  if (!rates) return 0;
  const counts = on === "coffee" ? (l) => l.kind === "coffee" : (l) => !["sub", "prepaid", "giftcard"].includes(l.kind);
  const base = pool.filter(counts).reduce((n, l) => n + l.price * l.qty, 0);
  let tax = 0;
  for (const l of lines) {
    const rate = rates[taxClass(l)] || 0;
    if (!(rate > 0)) continue;
    const amount = l.price * l.qty;
    const share = base > 0 && counts(l) ? (discount * amount) / base : 0;
    tax += Math.round(Math.max(0, amount - share) * rate * 100) / 100;
  }
  return Math.round(tax * 100) / 100;
}

const grindsFor = (p) => (p.ground === false ? ["Whole Bean"] : ["Whole Bean", p.type === "Filter" ? "Filter" : "Espresso"]);

// Subscription builder options.
const SUBSCRIPTION: any = {
  // Off every delivery of a subscription built on the subscriptions page (rotating Espresso,
  // Filter or House Blend)...
  discount: 0.18,
  // ...and of one shop coffee subscribed to from its own product page (or the coffee finder).
  productDiscount: 0.15,
  // A tea, from the subscriptions page or its own page.
  teaDiscount: 0.18,
  coffees: [
    { id: "espresso", label: "Espresso", note: "A rotating espresso each delivery", base: 26 },
    { id: "filter", label: "Filter", note: "A rotating single origin each delivery", base: 29 },
    { id: "house", label: "House Blend", note: "The same reliable blend, every time", base: 24 },
  ],
  // Who the subscription is for. A gift asks for the recipient's name and an optional message.
  recipients: [
    { id: "me", label: "For me" },
    { id: "gift", label: "For someone else" },
  ],
  // Size per delivery. `multiplier` is applied to the coffee's 250g price
  // (rounded to the dollar) before the subscription discount. Cups assume ~15g each.
  sizes: [
    { id: "250g", label: "250g", cups: 16, multiplier: 1 },
    { id: "500g", label: "500g", cups: 33, multiplier: 1.9 },
    { id: "1kg", label: "1kg", cups: 66, multiplier: 3.2 },
    // A tea's one size (tea: true keeps it off the coffee choices).
    { id: "8cups", label: "8 cups", cups: 8, tea: true },
  ],
  frequencies: [
    { id: "weekly", label: "Weekly", note: "Every week" },
    { id: "biweekly", label: "Every 2 weeks", note: "Every 2 weeks" },
    { id: "monthly", label: "Monthly", note: "Every month" },
  ],
  // Gift subscriptions paid up front: this many monthly deliveries, at the subscription price.
  prepaid: [3, 6, 12],
};

// A subscription is either to a rotating choice above ("espresso", "filter", "house") or to one
// coffee from the shop ("p:<product id>", started from its product page), sold in that
// coffee's own sizes at its own price, less the subscription discount.
function subscriptionCoffee(id) {
  const rotating = SUBSCRIPTION.coffees.find((c) => c.id === id);
  if (rotating) return { ...rotating, sizes: SUBSCRIPTION.sizes.filter((z) => !z.tea).map((z) => z.id) };
  // A tea ("t:<id>"): its 8 single-serve cups at its own price.
  const t = /^t:(.+)$/.exec(String(id || ""));
  const tea = t && ACCESSORIES.find((a) => a.id === t[1] && a.category === "Tea" && a.price != null);
  if (tea) return { id, product: tea.id, tea: true, label: tea.short || tea.name, note: tea.notes, sizes: ["8cups"], prices: { "8cups": tea.price } };
  const m = /^p:(.+)$/.exec(String(id || ""));
  const p = m && PRODUCTS.find((x) => x.id === m[1]);
  if (!p) return null;
  return { id, product: p.id, label: p.short || p.name, note: p.notes, sizes: ["250g", "1kg"], prices: { "250g": p.price, "1kg": p.price1kg }, grinds: grindsFor(p) };
}

// The discount (0 to 1) for a coffee from subscriptionCoffee: a shop coffee has its own prices.
const subscriptionDiscount = (coffee) => (coffee?.tea ? SUBSCRIPTION.teaDiscount : coffee?.prices ? SUBSCRIPTION.productDiscount : SUBSCRIPTION.discount);

// { full, price } per delivery for a coffee (from subscriptionCoffee) and a size id.
function subscriptionPrice(coffee, sizeId) {
  const size = SUBSCRIPTION.sizes.find((z) => z.id === sizeId);
  if (!coffee || !size || !coffee.sizes.includes(sizeId)) return null;
  const full = coffee.prices ? coffee.prices[sizeId] : Math.round(coffee.base * size.multiplier);
  return { full, price: Math.round(full * (1 - subscriptionDiscount(coffee)) * 100) / 100 };
}

// Outlets. Maps, directions, "Find the nearest shop" and the café delivery area use
// OpenStreetMap. With real addresses the server finds each shop's coordinates itself;
// to pin one exactly, set `coords` (on openstreetmap.org, right-click → "Show address").
// hours: index 0 = Sunday … 6 = Saturday, [open, close] in 24h "HH:MM", or null when closed.
// phone: given to couriers collecting delivery orders. squareLocationId: the bar's location in
// Square (Square dashboard → Locations), so its café orders print at that bar; empty uses the
// main SQUARE_LOCATION_ID. cafe: false keeps a location off Order Ahead (pickup and delivery
// of café orders); it still shows on the Locations page. photo is the picture on the Locations
// page and Order Ahead (left out, assets/<id>.jpg).
const LOCATIONS: any[] = [
  {
    id: "warehouse",
    coords: null,
    name: "Mimi Food",
    cafe: false,
    kind: "Office & Pickup",
    photo: "",
    address: ["1415 Maple Ave Suite 220", "Los Angeles, CA 90015"],
    hours: [null, ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], ["09:00", "18:00"], null], // Mon–Fri 9am–6pm
    color: "#c8102e",
    phone: "213-765-0382",
    squareLocationId: "",
  },
];

// Café drinks for Order Ahead. `style` picks the drawing (hot cup or iced cup);
// `color` is the drink colour shown in iced cups.
const CAFE_MENU: any[] = [];

const FAQ: any[] = [
  ["When will my order ship?", "Orders ship in 1–2 business days, tracked. You'll get an email with a tracking link when it's on its way."],
  ["What does Mimi Food make?", "Korean sauces, dressings, soup bases and seasonings, plus a Mala line, for cooking at home or in a restaurant."],
  ["How do I track my order?", "Every order email links to its tracking page. Logged in? Your orders are in your account."],
  ["Can I send something as a gift?", "Yes. Choose A gift at checkout, add a message and we'll print it on a card."],
  ["Do you ship internationally?", "Not yet. US only. Shipping is free over $60."],
  ["Can I return something?", "Food can't be returned. Anything damaged or wrong? Report it from your order page and we'll replace it or refund you."],
  ["Do you supply restaurants and shops?", "Yes. See our Wholesale page for case pricing and how to open an account."],
  ["Where do I find ingredients and allergens?", "They're on each product's label. Questions about a specific product? Tap Chat Us and we'll check for you."],
  ["Do gift cards expire?", "No. Check a balance on the Gift Cards page."],
  ["Can I talk to someone?", "Tap Chat Us in the menu or at the bottom of any page. Our assistant answers right away; tap Talk to a Person to reach the team."],
  ["How should I store my sauces?", "Keep unopened packs somewhere cool and dry. Once opened, refrigerate and use within the time on the label."],
];

// Where a return goes on its prepaid label, by the carrier printed on it (most are USPS), with
// each carrier's location finder.
const RETURN_DROPOFF: any = {
  USPS: { where: "Any Post Office, or a free pickup from your door", find: "https://tools.usps.com/find-location.htm" },
  UPS: { where: "The UPS Store or a UPS Access Point", find: "https://www.ups.com/dropoff" },
  FedEx: { where: "FedEx Office or a FedEx drop-off location", find: "https://local.fedex.com/" },
};
const returnDropoff = (carrier) => RETURN_DROPOFF[Object.keys(RETURN_DROPOFF).find((k) => k.toLowerCase() === String(carrier || "").toLowerCase())] || null;

// US states and territories for shipping addresses.
const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"],
  ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"],
  ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["PR", "Puerto Rico"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
