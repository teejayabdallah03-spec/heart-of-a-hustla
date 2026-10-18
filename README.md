# Heart of a Hustla

A responsive, standalone storefront for a locally made streetwear brand. It uses plain HTML, CSS, JavaScript, and a dependency-free Node.js server.

## Preview

Run `node server.js` from this folder and open `http://localhost:4173`. To build the static files and Netlify Functions for deployment, run `node build.js`; the publishable site is generated in `dist/`. The five supplied hoodie color options, HOH logo, and neon-ready slogan art are local files under `assets/`. Community/lifestyle imagery and display fonts load from Unsplash and Google Fonts. The cart uses browser local storage.

## Storefront interactions

- Responsive navigation, product search, category/size/availability filters, and price sorting
- Product detail dialogs with size selection and a size/fit guide
- Six separate hoodie listings (Royal Blue, Red, Rose Pink, Black, Orange, Sunshine Yellow) with matching product images at $60 each
- Separate Coming Soon gallery for the five-color rhinestone hoodie, black beanie, and six varsity jacket colorways; these styles are display-only and are not available in the cart or checkout
- Flat-rate $10 shipping in the cart and checkout preview
- Stripe-hosted Checkout with server-validated product IDs, sizes, quantities, and prices
- Slide-out bag with quantity controls and persistence in local storage
- Shipping estimate and a clearly labeled checkout preview
- Contact form preview, newsletter preview, FAQ, and community links

## Before accepting real orders

## Connect Stripe

1. Create or sign in to the owner's Stripe account and add the payout bank account in Stripe's Dashboard.
2. Copy `.env.example` to `.env` and set `STRIPE_SECRET_KEY` to a **test restricted key** (`rk_test_...`) or test secret key (`sk_test_...`). For a restricted key, grant **Customers: Write** and **Checkout Sessions: Write** only; Stripe's Write permission includes Read. Keep `.env` private; it is excluded from version control.
3. Run `node server.js`, open `http://localhost:4173`, and complete a test-mode checkout. The browser only receives a Stripe-hosted Checkout URL; the secret key and card details stay off the storefront.
4. Before launch, deploy the Node server or the Netlify Functions behind HTTPS. Create a live restricted key with the same tested permissions, set it as `STRIPE_SECRET_KEY`, and explicitly set `STRIPE_LIVE_PAYMENTS=true` only after testing. Live charges are intentionally blocked without production mode, HTTPS, and this opt-in.

Stripe Checkout sends the payment to the Stripe account associated with `STRIPE_SECRET_KEY`; configured Stripe payouts then send funds to the bank account on that Stripe account. The ZIP supplied for reference is a mock/demo gateway, not a real processor, so its simulated approval flow is not used.

## Deploy through Netlify

The Netlify build publishes only the storefront and its referenced product assets from `dist/`. The three `/api/*` endpoints are routed to Netlify Functions; the local `server.js`, source-only images, and `.env` are not deployed as public files. Connect the private GitHub repository to Netlify, set the build command to `node build.js` and publish directory to `dist` (these are already specified in `netlify.toml`), then add the Stripe settings in the Netlify site's private environment variables:

- For initial testing: `STRIPE_SECRET_KEY` set to the Stripe test restricted key (`rk_test_...`) or test secret key. A restricted key for this integration only needs **Customers: Write** and **Checkout Sessions: Write**. Test mode may be used on a Netlify preview URL; it never charges a real card.
- For live payments after test checkout succeeds: set `PUBLIC_BASE_URL` to the site's canonical HTTPS URL, `STRIPE_SECRET_KEY` to the owner's live restricted key (`rk_live_...`) with those same permissions, and `STRIPE_LIVE_PAYMENTS=true`. Keep `NODE_ENV=production` for the production deploy. Live checkout remains blocked unless all live-mode requirements are met.
- Netlify can use the existing `STRIPE_KEY` environment variable as a compatibility fallback, but prefer `STRIPE_SECRET_KEY` and mark it as a secret in Netlify. Never expose either variable to browser code or share its value in chat.

Trigger a fresh production deploy after changing environment variables, and verify that `/api/status` reports `paymentReady: true` and a successful Stripe test-mode payment flow before enabling live charges. Its `checks` object reports only configuration readiness booleans, never key material. Do not commit or publish `.env`.

This setup does **not** include an owner dashboard, tax calculation, webhook-driven fulfillment, order database, or email delivery. The contact and newsletter forms remain previews and do not retain or send submissions. Product prices are set to $60 per hoodie and shipping to a flat $10 per order; displayed inventory is sample data, not live stock. Never put Stripe secret keys in HTML, CSS, or client-side JavaScript.

Update the sample stock, size availability, contact email, and social links with approved brand information. Upcoming designs are intentionally display-only; add them to the storefront and server-side catalog only when they are ready to sell.
