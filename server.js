"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const ROOT = __dirname;
const SHIPPING_CENTS = 1000;
const MAX_REQUEST_BYTES = 32 * 1024;
const SIZES = new Set(["S", "M", "L", "XL", "2XL", "3XL"]);
const PRODUCTS = new Map([
  ["ambition-blue", { name: "Built on Ambition Studded Zip Hoodie", color: "Royal Blue", price: 6000 }],
  ["ambition-red", { name: "Built on Ambition Studded Zip Hoodie", color: "Red", price: 6000 }],
  ["ambition-pink", { name: "Built on Ambition Studded Zip Hoodie", color: "Rose Pink", price: 6000 }],
  ["ambition-black", { name: "Built on Ambition Studded Zip Hoodie", color: "Black", price: 6000 }],
  ["ambition-orange", { name: "Built on Ambition Studded Zip Hoodie", color: "Orange", price: 6000 }],
  ["ambition-yellow", { name: "Built on Ambition Studded Zip Hoodie", color: "Sunshine Yellow", price: 6000 }]
]);

function loadLocalEnvironment() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadLocalEnvironment();

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "127.0.0.1";

function stripeSecret() {
  return [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_KEY]
    .map((key) => (key || "").trim())
    .find((key) => /^(sk|rk)_(test|live)_[A-Za-z0-9_-]{16,}$/.test(key)) || "";
}

function publicBaseUrl() {
  const base = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("PUBLIC_BASE_URL must be an HTTP or HTTPS origin.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("PUBLIC_BASE_URL must be an origin without a path or query.");
  }
  return url;
}

function livePaymentsAllowed() {
  const key = stripeSecret();
  if (!key) return false;
  if (/^(sk|rk)_test_/.test(key)) return true;
  const base = publicBaseUrl();
  return process.env.NODE_ENV === "production"
    && process.env.STRIPE_LIVE_PAYMENTS === "true"
    && base.protocol === "https:";
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error.message === "request_too_large") throw error;
    throw new Error("invalid_json");
  }
}

function validateCustomer(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const customer = {
    name: String(value.name || "").trim(),
    email: String(value.email || "").trim().toLowerCase(),
    phone: String(value.phone || "").trim(),
    address: String(value.address || "").trim(),
    city: String(value.city || "").trim(),
    state: String(value.state || "").trim(),
    zip: String(value.zip || "").trim(),
    country: String(value.country || "").trim().toUpperCase()
  };
  if (customer.name.length < 2 || customer.name.length > 100) return null;
  if (customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return null;
  if (customer.phone.length > 30 || !customer.address || customer.address.length > 200) return null;
  if (!customer.city || customer.city.length > 100 || !customer.state || customer.state.length > 100) return null;
  if (!customer.zip || customer.zip.length > 20 || !["US", "CA"].includes(customer.country)) return null;
  return customer;
}

function validateItems(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) return null;
  const items = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return null;
    const product = PRODUCTS.get(String(entry.id || ""));
    const size = String(entry.size || "");
    const quantity = Number(entry.quantity);
    if (!product || !SIZES.has(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return null;
    }
    items.push({ id: String(entry.id), ...product, size, quantity });
  }
  return items;
}

async function stripeRequest(endpoint, fields, method = "POST") {
  const secret = stripeSecret();
  if (!secret) throw new Error("stripe_not_configured");
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json"
    }
  };
  let url = `https://api.stripe.com/v1/${endpoint}`;
  if (method === "GET") {
    url += `?${new URLSearchParams(fields)}`;
  } else {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.body = new URLSearchParams(fields).toString();
  }

  const response = await fetch(url, options);
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("stripe_invalid_response");
  }
  if (!response.ok) {
    console.error("[payments] Stripe request failed", {
      endpoint,
      status: response.status,
      code: result.error?.code || "unknown"
    });
    throw new Error("stripe_request_failed");
  }
  return result;
}

function validateRequestOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).origin === publicBaseUrl().origin;
  } catch {
    return false;
  }
}

async function createCheckout(request, response) {
  if (!livePaymentsAllowed()) {
    return sendJson(response, 503, { error: "Secure checkout is not configured." });
  }
  if (!validateRequestOrigin(request)) {
    return sendJson(response, 403, { error: "Checkout request origin was rejected." });
  }

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    const tooLarge = error.message === "request_too_large";
    return sendJson(response, tooLarge ? 413 : 400, {
      error: tooLarge ? "Checkout request is too large." : "Checkout details could not be read."
    });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return sendJson(response, 400, { error: "Checkout details could not be read." });
  }
  const items = validateItems(body.items);
  const customer = validateCustomer(body.customer);
  if (!items || !customer) {
    return sendJson(response, 400, { error: "Check your contact, shipping, size, and cart details." });
  }

  try {
    const stripeCustomer = await stripeRequest("customers", {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      "address[line1]": customer.address,
      "address[city]": customer.city,
      "address[state]": customer.state,
      "address[postal_code]": customer.zip,
      "address[country]": customer.country,
      "shipping[name]": customer.name,
      "shipping[phone]": customer.phone,
      "shipping[address][line1]": customer.address,
      "shipping[address][city]": customer.city,
      "shipping[address][state]": customer.state,
      "shipping[address][postal_code]": customer.zip,
      "shipping[address][country]": customer.country
    });

    const fields = {
      mode: "payment",
      customer: stripeCustomer.id,
      client_reference_id: crypto.randomUUID(),
      "metadata[store]": "heart-of-a-hustla",
      "billing_address_collection": "auto",
      "shipping_address_collection[allowed_countries][0]": customer.country,
      "phone_number_collection[enabled]": "true",
      "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
      "shipping_options[0][shipping_rate_data][fixed_amount][amount]": String(SHIPPING_CENTS),
      "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "usd",
      "shipping_options[0][shipping_rate_data][display_name]": "Flat-rate shipping",
      "success_url": `${publicBaseUrl().origin}/?checkout_session_id={CHECKOUT_SESSION_ID}#collection`,
      "cancel_url": `${publicBaseUrl().origin}/?checkout=cancel#collection`,
      "expires_at": String(Math.floor(Date.now() / 1000) + 31 * 60)
    };

    items.forEach((item, index) => {
      fields[`line_items[${index}][price_data][currency]`] = "usd";
      fields[`line_items[${index}][price_data][unit_amount]`] = String(item.price);
      fields[`line_items[${index}][price_data][product_data][name]`] = `${item.name} — ${item.color} / Size ${item.size}`;
      fields[`line_items[${index}][quantity]`] = String(item.quantity);
    });

    const session = await stripeRequest("checkout/sessions", fields);
    if (!session.url || !session.url.startsWith("https://checkout.stripe.com/")) {
      throw new Error("stripe_checkout_url_missing");
    }
    return sendJson(response, 200, { checkoutUrl: session.url });
  } catch (error) {
    if (error.message === "stripe_not_configured") {
      return sendJson(response, 503, { error: "Secure checkout is not configured." });
    }
    console.error("[payments] Unable to create a checkout session", error.message);
    return sendJson(response, 502, { error: "Secure checkout is temporarily unavailable. Please try again." });
  }
}

async function verifyCheckoutSession(request, response, url) {
  if (!stripeSecret()) return sendJson(response, 503, { error: "Secure checkout is not configured." });
  const sessionId = url.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return sendJson(response, 400, { error: "Checkout reference is invalid." });
  }
  try {
    const session = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`, {}, "GET");
    if (session.metadata?.store !== "heart-of-a-hustla") {
      return sendJson(response, 404, { error: "Checkout reference was not found." });
    }
    return sendJson(response, 200, {
      paymentStatus: session.payment_status,
      orderReference: session.id.slice(-8).toUpperCase()
    });
  } catch (error) {
    console.error("[payments] Unable to verify a checkout session", error.message);
    return sendJson(response, 502, { error: "Payment status is temporarily unavailable." });
  }
}

function contentType(filePath) {
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8"
  };
  return types[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function serveStatic(response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end("Bad request");
    return;
  }
  if (decodedPath.includes("\\") || decodedPath.split("/").some((part) => part.startsWith("."))) {
    response.writeHead(404).end("Not found");
    return;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = path.resolve(ROOT, relativePath);
  if (!filePath.toLowerCase().startsWith(`${ROOT}${path.sep}`.toLowerCase()) || filePath === __filename) {
    response.writeHead(404).end("Not found");
    return;
  }

  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": path.extname(filePath) === ".html" ? "no-store" : "public, max-age=3600"
    });
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      response.writeHead(404).end("Not found");
      return;
    }
    console.error("[static] Unable to serve file", error.message);
    response.writeHead(500).end("Server error");
  }
}

const server = http.createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname === "/api/status" && request.method === "GET") {
      return sendJson(response, 200, { paymentReady: livePaymentsAllowed() });
    }
    if (url.pathname === "/api/checkout" && request.method === "POST") {
      return await createCheckout(request, response);
    }
    if (url.pathname === "/api/checkout-session" && request.method === "GET") {
      return await verifyCheckoutSession(request, response, url);
    }
    if (url.pathname.startsWith("/api/")) {
      return sendJson(response, 404, { error: "Not found." });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
      return;
    }
    await serveStatic(response, url.pathname);
  } catch (error) {
    console.error("[server] Request failed", error.message);
    if (!response.headersSent) sendJson(response, 500, { error: "A server error occurred." });
    else response.destroy();
  }
});

server.listen(PORT, HOST, () => {
  const paymentMode = livePaymentsAllowed() ? "configured" : "not configured";
  console.log(`Heart of a Hustla storefront: http://${HOST}:${PORT}`);
  console.log(`Stripe payments: ${paymentMode}`);
});
