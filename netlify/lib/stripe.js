"use strict";

const crypto = require("node:crypto");

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

function stripeSecret() {
  return [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_KEY]
    .map((key) => (key || "").trim())
    .find((key) => /^(sk|rk)_(test|live)_[A-Za-z0-9_-]{16,}$/.test(key)) || "";
}

function siteOrigin(rawUrl) {
  const configured = process.env.PUBLIC_BASE_URL;
  const url = new URL(configured || rawUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("invalid_site_url");
  }
  if (configured && (url.pathname !== "/" || url.search || url.hash)) {
    throw new Error("invalid_site_url");
  }
  return url.origin;
}

function paymentStatus(rawUrl) {
  const configuredKey = [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_KEY]
    .some((key) => Boolean((key || "").trim()));
  const key = stripeSecret();
  const checks = {
    stripeKeyPresent: Boolean(configuredKey),
    stripeKeyFormatValid: Boolean(key),
    productionMode: process.env.NODE_ENV === "production",
    livePaymentsEnabled: process.env.STRIPE_LIVE_PAYMENTS === "true",
    httpsBaseUrl: false
  };
  if (!key) return { paymentReady: false, checks };
  if (/^(sk|rk)_test_/.test(key)) return { paymentReady: true, checks };
  try {
    checks.httpsBaseUrl = new URL(siteOrigin(rawUrl)).protocol === "https:";
    return {
      paymentReady: checks.productionMode && checks.livePaymentsEnabled && checks.httpsBaseUrl,
      checks
    };
  } catch (error) {
    console.error("[payments] Invalid public site URL", error.message);
    return { paymentReady: false, checks };
  }
}

function paymentReady(rawUrl) {
  return paymentStatus(rawUrl).paymentReady;
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

function parseRequestBody(event) {
  if (typeof event.body !== "string" || Buffer.byteLength(event.body, "utf8") > MAX_REQUEST_BYTES) {
    return null;
  }
  try {
    return JSON.parse(event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body);
  } catch {
    return null;
  }
}

function validateCustomer(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const customer = {
    name: String(value.name || "").trim(),
    email: String(value.email || "").trim().toLowerCase(),
    phone: String(value.phone || "").trim()
  };
  if (customer.name.length < 2 || customer.name.length > 100) return null;
  if (customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return null;
  if (customer.phone.length > 30 || !/^[+()\d.\s-]+$/.test(customer.phone) || (customer.phone.match(/\d/g) || []).length < 7) return null;
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

function validateRequestOrigin(event, origin) {
  const requestOrigin = event.headers?.origin;
  return !requestOrigin || requestOrigin === origin;
}

async function createCheckout(event) {
  let origin;
  try {
    origin = siteOrigin(event.rawUrl);
  } catch (error) {
    console.error("[payments] Invalid public site URL", error.message);
    return jsonResponse(503, { error: "Secure checkout is not configured." });
  }
  if (!paymentReady(event.rawUrl)) {
    return jsonResponse(503, { error: "Secure checkout is not configured." });
  }
  if (!validateRequestOrigin(event, origin)) {
    return jsonResponse(403, { error: "Checkout request origin was rejected." });
  }

  const body = parseRequestBody(event);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse(400, { error: "Checkout details could not be read." });
  }
  const items = validateItems(body.items);
  const customer = validateCustomer(body.customer);
  const fulfillment = body.fulfillment;
  if (!items || !customer || !["ship", "pickup"].includes(fulfillment)) {
    return jsonResponse(400, { error: "Check your contact, fulfillment, size, and cart details." });
  }

  try {
    const stripeCustomer = await stripeRequest("customers", {
      name: customer.name,
      email: customer.email,
      phone: customer.phone
    });

    const fields = {
      mode: "payment",
      customer: stripeCustomer.id,
      client_reference_id: crypto.randomUUID(),
      "metadata[store]": "heart-of-a-hustla",
      "metadata[fulfillment]": fulfillment,
      "billing_address_collection": "auto",
      "phone_number_collection[enabled]": "true",
      "success_url": `${origin}/?checkout_session_id={CHECKOUT_SESSION_ID}#collection`,
      "cancel_url": `${origin}/?checkout=cancel#collection`,
      "expires_at": String(Math.floor(Date.now() / 1000) + 31 * 60)
    };
    if (fulfillment === "ship") {
      fields["customer_update[shipping]"] = "auto";
      fields["shipping_address_collection[allowed_countries][0]"] = "US";
      fields["shipping_address_collection[allowed_countries][1]"] = "CA";
      fields["shipping_options[0][shipping_rate_data][type]"] = "fixed_amount";
      fields["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] = String(SHIPPING_CENTS);
      fields["shipping_options[0][shipping_rate_data][fixed_amount][currency]"] = "usd";
      fields["shipping_options[0][shipping_rate_data][display_name]"] = "Flat-rate shipping";
    }
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
    return jsonResponse(200, { checkoutUrl: session.url });
  } catch (error) {
    if (error.message === "stripe_not_configured") {
      return jsonResponse(503, { error: "Secure checkout is not configured." });
    }
    console.error("[payments] Unable to create a checkout session", error.message);
    return jsonResponse(502, { error: "Secure checkout is temporarily unavailable. Please try again." });
  }
}

async function verifyCheckoutSession(event) {
  if (!stripeSecret()) {
    return jsonResponse(503, { error: "Secure checkout is not configured." });
  }
  const sessionId = event.queryStringParameters?.session_id || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return jsonResponse(400, { error: "Checkout reference is invalid." });
  }
  try {
    const session = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`, {}, "GET");
    if (session.metadata?.store !== "heart-of-a-hustla") {
      return jsonResponse(404, { error: "Checkout reference was not found." });
    }
    return jsonResponse(200, {
      paymentStatus: session.payment_status,
      orderReference: session.id.slice(-8).toUpperCase(),
      fulfillmentMethod: session.metadata?.fulfillment === "pickup" ? "pickup" : "ship"
    });
  } catch (error) {
    console.error("[payments] Unable to verify a checkout session", error.message);
    return jsonResponse(502, { error: "Payment status is temporarily unavailable." });
  }
}

module.exports = {
  createCheckout,
  jsonResponse,
  paymentReady,
  paymentStatus,
  verifyCheckoutSession
};
