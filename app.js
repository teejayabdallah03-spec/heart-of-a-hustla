"use strict";

const PRODUCTS = [
  { id: "ambition-blue", name: "Built on Ambition Studded Zip Hoodie", price: 60, category: "hoodies", color: "Royal Blue", badge: "THE AMBITION DROP", image: "assets/hoodie-royal-blue.png", description: "The signature studded full-zip hoodie, with Heart of a Hustla sleeve lettering and the Built on Ambition, Driven by Purpose statement across the back.", alt: "Royal blue studded Heart of a Hustla zip hoodie, shown front and back", stock: 18, sizes: ["S", "M", "L", "XL", "2XL", "3XL"] },
  { id: "ambition-red", name: "Built on Ambition Studded Zip Hoodie", price: 60, category: "hoodies", color: "Red", badge: "THE AMBITION DROP", image: "assets/hoodie-front.png", description: "The signature studded full-zip hoodie, with Heart of a Hustla sleeve lettering and the Built on Ambition, Driven by Purpose statement across the back.", alt: "Red studded Heart of a Hustla zip hoodie", stock: 18, sizes: ["S", "M", "L", "XL", "2XL", "3XL"] },
  { id: "ambition-pink", name: "Built on Ambition Studded Zip Hoodie", price: 60, category: "hoodies", color: "Rose Pink", badge: "THE AMBITION DROP", image: "assets/hoodie-rose-pink.png", description: "The signature studded full-zip hoodie, with Heart of a Hustla sleeve lettering and the Built on Ambition, Driven by Purpose statement across the back.", alt: "Rose pink studded Heart of a Hustla zip hoodie, shown front and back", stock: 18, sizes: ["S", "M", "L", "XL", "2XL", "3XL"] },
  { id: "ambition-black", name: "Built on Ambition Studded Zip Hoodie", price: 60, category: "hoodies", color: "Black", badge: "THE AMBITION DROP", image: "assets/hoodie-black.png", description: "The signature studded full-zip hoodie, with Heart of a Hustla sleeve lettering and the Built on Ambition, Driven by Purpose statement across the back.", alt: "Black studded Heart of a Hustla zip hoodie, shown front and back", stock: 18, sizes: ["S", "M", "L", "XL", "2XL", "3XL"] },
  { id: "ambition-orange", name: "Built on Ambition Studded Zip Hoodie", price: 60, category: "hoodies", color: "Orange", badge: "THE AMBITION DROP", image: "assets/hoodie-orange.png", description: "The signature studded full-zip hoodie, with Heart of a Hustla sleeve lettering and the Built on Ambition, Driven by Purpose statement across the back.", alt: "Orange studded Heart of a Hustla zip hoodie, shown front and back", stock: 18, sizes: ["S", "M", "L", "XL", "2XL", "3XL"] },
  { id: "ambition-yellow", name: "Built on Ambition Studded Zip Hoodie", price: 60, category: "hoodies", color: "Sunshine Yellow", badge: "THE AMBITION DROP", image: "assets/hoodie-sunshine-yellow.png", description: "The signature studded full-zip hoodie, with Heart of a Hustla sleeve lettering and the Built on Ambition, Driven by Purpose statement across the back.", alt: "Sunshine yellow studded Heart of a Hustla zip hoodie, shown front and back", stock: 18, sizes: ["S", "M", "L", "XL", "2XL", "3XL"] }
];
const COMING_SOON_PRODUCTS = [
  { name: "Heart Rhinestone Zip Hoodie", color: "Rose Pink", image: "assets/coming-soon-zip-hoodie-pink.png", alt: "Rose pink cropped zip hoodie with rhinestone Heart of a Hustla detailing" },
  { name: "Heart Rhinestone Zip Hoodie", color: "Red", image: "assets/coming-soon-crop-hoodie-red.png", alt: "Red cropped zip hoodie with rhinestone Heart of a Hustla detailing" },
  { name: "Heart Rhinestone Zip Hoodie", color: "Royal Blue", image: "assets/coming-soon-crop-hoodie-blue.png", alt: "Royal blue cropped zip hoodie with rhinestone Heart of a Hustla detailing" },
  { name: "Heart Rhinestone Zip Hoodie", color: "Sunshine Yellow", image: "assets/coming-soon-crop-hoodie-yellow.png", alt: "Sunshine yellow cropped zip hoodie with rhinestone Heart of a Hustla detailing" },
  { name: "Heart Rhinestone Zip Hoodie", color: "Black", image: "assets/coming-soon-crop-hoodie-black.png", alt: "Black cropped zip hoodie with rhinestone Heart of a Hustla detailing" },
  { name: "Heart Rhinestone Zip Hoodie", color: "Purple", image: "assets/coming-soon-crop-hoodie-purple.png", alt: "Purple cropped zip hoodie with rhinestone Heart of a Hustla detailing" },
  { name: "Heart of a Hustla Knit Beanie", color: "Black", image: "assets/coming-soon-beanie-black.png", alt: "Black knit beanie embroidered with the Heart of a Hustla logo" },
  { name: "Heart Varsity Jacket", color: "Black & Orange", image: "assets/coming-soon-varsity-orange.png", alt: "Black varsity jacket with orange sleeves and Heart of a Hustla back graphic" },
  { name: "Heart Varsity Jacket", color: "Black & White", image: "assets/coming-soon-varsity-black-white.png", alt: "Black varsity jacket with white sleeves and Heart of a Hustla back graphic" },
  { name: "Heart Varsity Jacket", color: "Purple & White", image: "assets/coming-soon-varsity-purple-white.png", alt: "Purple varsity jacket with white sleeves and Heart of a Hustla back graphic" },
  { name: "Heart Varsity Jacket", color: "Royal Blue & White", image: "assets/coming-soon-varsity-blue-white.png", alt: "Royal blue varsity jacket with white sleeves and Heart of a Hustla back graphic" },
  { name: "Heart Varsity Jacket", color: "Red & White", image: "assets/coming-soon-varsity-red-white.png", alt: "Red varsity jacket with white sleeves and Heart of a Hustla back graphic" },
  { name: "Heart Varsity Jacket", color: "Pink & White", image: "assets/coming-soon-varsity-pink-white.png", alt: "Pink varsity jacket with white sleeves and Heart of a Hustla back graphic" }
];
const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const STORAGE_KEY = "hoah-cart-v1";
const SHIPPING_COST = 10;
let cart = readCart();
let selectedProduct = null;
let selectedSize = "";
let toastTimer;
let paymentReady = false;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (amount) => `$${amount.toFixed(2)}`;

function announce(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

async function refreshPaymentStatus() {
  try {
    const response = await fetch("/api/status", { headers: { Accept: "application/json" } });
    const result = await response.json();
    paymentReady = response.ok && result.paymentReady === true;
  } catch (error) {
    console.warn("Secure checkout is unavailable until the storefront server is running.", error);
    paymentReady = false;
  }
  return paymentReady;
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) throw new Error("The saved bag was not a list.");
    return saved.reduce((lines, savedLine) => {
      const migratedColors = {
        "royal-blue": "ambition-blue",
        red: "ambition-red",
        "rose-pink": "ambition-pink",
        black: "ambition-black",
        orange: "ambition-orange",
        "sunshine-yellow": "ambition-yellow"
      };
      const legacyIds = ["heart-first-zip", "built-on-ambition", "ambition-zip-hoodie"];
      const line = legacyIds.includes(savedLine.id)
        ? { ...savedLine, id: migratedColors[savedLine.color] || "ambition-black" }
        : savedLine;
      const product = PRODUCTS.find((item) => item.id === line.id);
      const validLine = product
        && SIZES.includes(line.size)
        && Number.isInteger(line.quantity)
        && line.quantity > 0;
      if (validLine) {
        const existing = lines.find((item) => item.id === line.id && item.size === line.size);
        if (existing) existing.quantity += line.quantity;
        else lines.push({ id: line.id, size: line.size, quantity: line.quantity });
      }
      return lines;
    }, []);
  } catch (error) {
    console.error("Unable to restore the saved shopping bag.", error);
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Unable to save the shopping bag.", error);
    announce("Your bag couldn't be saved on this device.");
  }
}

function renderProducts() {
  const category = $("#category-filter").value;
  const size = $("#size-filter").value;
  const sort = $("#sort-filter").value;
  const inStock = $("#stock-filter").checked;
  const query = $("#product-search").value.trim().toLowerCase();
  let products = PRODUCTS.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const matchesSize = size === "all" || product.sizes.includes(size);
    const matchesStock = !inStock || product.stock > 0;
    const matchesSearch = !query || `${product.name} ${product.color} ${product.description}`.toLowerCase().includes(query);
    return matchesCategory && matchesSize && matchesStock && matchesSearch;
  });
  if (sort === "low") products = products.sort((a, b) => a.price - b.price);
  if (sort === "high") products = products.sort((a, b) => b.price - a.price);
  $("#product-count").textContent = String(products.length).padStart(2, "0");
  $("#product-grid").innerHTML = products.map((product) => `
    <article class="product-card" data-product-card="${product.id}">
      <div class="product-image-wrap">
        <button class="product-view" type="button" data-view="${product.id}" aria-label="View ${product.color} ${product.name}"><img class="product-image" src="${product.image}" alt="${product.alt}" loading="lazy"></button>
        ${product.badge ? `<span class="product-badge${product.stock === 0 ? " sold" : ""}">${product.stock === 0 ? "SOLD OUT" : product.badge}</span>` : ""}
        <button class="quick-add" type="button" data-add="${product.id}" ${product.stock === 0 ? "disabled" : ""}>${product.stock === 0 ? "SOLD OUT" : "QUICK ADD"} <span aria-hidden="true">+</span></button>
      </div>
      <div class="product-meta"><div><p class="product-name">${product.name}</p><p class="product-color">${product.color}</p></div><p class="product-price">${money(product.price)}</p></div>
    </article>`).join("");
}

function renderComingSoon() {
  $("#coming-soon-grid").innerHTML = COMING_SOON_PRODUCTS.map((product) => `
    <article class="coming-soon-card">
      <div class="coming-soon-image">
        <img src="${product.image}" alt="${product.alt}" loading="lazy">
        <span class="coming-soon-badge">COMING SOON</span>
      </div>
      <div class="coming-soon-meta"><div><p class="coming-soon-name">${product.name}</p><p class="coming-soon-color">${product.color}</p></div><span class="coming-soon-status" aria-hidden="true">●</span></div>
    </article>`).join("");
}

function setBagCount() {
  const quantity = cart.reduce((total, line) => total + line.quantity, 0);
  $$(".bag-count").forEach((badge) => { badge.textContent = quantity; });
}

function subtotal() {
  return cart.reduce((total, line) => total + PRODUCTS.find((product) => product.id === line.id).price * line.quantity, 0);
}

function openCart() {
  closeMobileMenu();
  renderCart();
  $("#cart-drawer").classList.add("open");
  $("#cart-drawer").setAttribute("aria-hidden", "false");
  $("#overlay").classList.add("open");
  $("#overlay").setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
  $(".drawer-close").focus();
}

function closeCart() {
  $("#cart-drawer").classList.remove("open");
  $("#cart-drawer").setAttribute("aria-hidden", "true");
  $("#overlay").classList.remove("open");
  $("#overlay").setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function renderCart() {
  const content = $("#cart-content");
  const footer = $("#cart-footer");
  setBagCount();
  if (!cart.length) {
    content.innerHTML = `<div class="cart-empty"><h3>ALL HEART.<br>NO BAG.</h3><p>Your bag is empty. The next move is yours.</p><a class="button button-primary" href="#collection">SHOP THE DROP <span>↗</span></a></div>`;
    footer.innerHTML = "";
    $(".cart-empty a").addEventListener("click", closeCart);
    return;
  }
  content.innerHTML = cart.map((line) => {
    const product = PRODUCTS.find((item) => item.id === line.id);
    return `<article class="cart-line"><img src="${product.image}" alt="${product.alt}"><div><h3>${product.name}</h3><p>${product.color} · Size ${line.size}</p><span class="cart-line-price">${money(product.price)}</span><div class="quantity-control" aria-label="Quantity for ${product.color} ${product.name} size ${line.size}"><button type="button" data-quantity="${line.id}|${line.size}|-1" aria-label="Remove one">−</button><span>${line.quantity}</span><button type="button" data-quantity="${line.id}|${line.size}|1" aria-label="Add one">+</button></div></div><button class="remove-item" type="button" data-remove="${line.id}|${line.size}">REMOVE</button></article>`;
  }).join("");
  const total = subtotal();
  footer.innerHTML = `<div class="cart-summary-line"><span>SUBTOTAL</span><strong>${money(total)}</strong></div><p class="cart-shipping-note">Flat-rate shipping: ${money(SHIPPING_COST)}.</p><button type="button" class="button button-primary checkout-start">CONTINUE TO CHECKOUT <span>↗</span></button><p class="cart-secure">Secure payment powered by Stripe</p>`;
  $(".checkout-start").addEventListener("click", async () => {
    await refreshPaymentStatus();
    openCheckout();
  });
}

function openProduct(id) {
  selectedProduct = PRODUCTS.find((product) => product.id === id);
  if (!selectedProduct) return;
  selectedSize = "";
  $("#product-detail").innerHTML = `
    <div class="product-detail-grid">
      <img class="product-detail-image" src="${selectedProduct.image}" alt="${selectedProduct.alt}">
      <div class="product-detail-copy"><p class="eyebrow">THE AMBITION DROP · LOCALLY MADE</p><h2 id="dialog-title">${selectedProduct.name}</h2><div class="detail-price">${money(selectedProduct.price)}</div><p class="detail-description">${selectedProduct.description}</p><div class="color-label"><span>COLOR</span><strong>${selectedProduct.color}</strong></div><ul class="detail-specs"><li>Studded full-zip hoodie</li><li>Heart of a Hustla sleeve lettering</li><li>Built on Ambition back graphic</li></ul><div class="size-label"><span>SELECT YOUR SIZE</span><button class="size-guide-button" type="button" aria-expanded="false">SIZE GUIDE +</button></div><div class="size-options">${SIZES.map((size) => `<button type="button" class="size-option" data-size="${size}" aria-pressed="false" ${selectedProduct.sizes.includes(size) ? "" : "disabled"}>${size}</button>`).join("")}</div><p class="size-error" aria-live="polite"></p><button class="button button-primary detail-add" type="button" ${selectedProduct.stock === 0 ? "disabled" : ""}>${selectedProduct.stock === 0 ? "SOLD OUT" : "ADD TO BAG"} <span>↗</span></button><details class="size-guide"><summary>FIT & CARE</summary><p>Relaxed fit. For a roomier feel, size up. Machine wash cold inside out with like colors. Tumble dry low. Do not iron decoration.</p><p>Size guide: S (chest 36–38 in), M (38–40 in), L (40–42 in), XL (42–44 in), 2XL (44–46 in), 3XL (46–48 in).</p></details></div>
    </div>`;
  $("#product-dialog").showModal();
  $(".dialog-close", $("#product-dialog")).focus();
}

function addToCart(product, size) {
  const line = cart.find((item) => item.id === product.id && item.size === size);
  if (line) line.quantity += 1;
  else cart.push({ id: product.id, size, quantity: 1 });
  saveCart();
  setBagCount();
  $("#product-dialog").close();
  announce(`${product.name} · ${size} added to your bag.`);
  openCart();
}

function openCheckout() {
  if (!cart.length) return;
  closeCart();
  const total = subtotal();
  const shipping = SHIPPING_COST;
  const itemSummary = cart.map((line) => {
    const product = PRODUCTS.find((item) => item.id === line.id);
    return `<p><span>${product.color} hoodie · ${line.size} × ${line.quantity}</span><strong>${money(product.price * line.quantity)}</strong></p>`;
  }).join("");
  const paymentNotice = paymentReady
    ? "Your payment is securely processed by Stripe. Your card details never touch this site."
    : "Secure checkout is not configured. The store owner must connect a Stripe account before orders can be paid.";
  $("#checkout-content").innerHTML = `
    <div class="checkout-inner"><p class="eyebrow">ONE LAST STEP</p><h2 id="checkout-title">SECURE CHECKOUT</h2><p>Review your details before continuing to secure payment.</p><div class="demo-notice">${paymentNotice}</div>
      <form id="checkout-form" class="checkout-form">
        <label class="full">FULL NAME<input name="name" autocomplete="name" required></label>
        <label>EMAIL<input name="email" type="email" autocomplete="email" required></label><label>PHONE<input name="phone" type="tel" autocomplete="tel"></label>
        <label class="full">STREET ADDRESS<input name="address" autocomplete="street-address" required></label>
        <label>CITY<input name="city" autocomplete="address-level2" required></label><label>STATE<input name="state" autocomplete="address-level1" required></label>
        <label>ZIP CODE<input name="zip" autocomplete="postal-code" required></label><label>COUNTRY<select name="country" autocomplete="country-name"><option>United States</option><option>Canada</option></select></label>
        <label class="full">SHIPPING METHOD<select name="shipping"><option value="${shipping}">Flat-rate shipping · ${money(shipping)}</option></select></label>
        <div class="checkout-summary full">${itemSummary}<p><span>Subtotal · ${cart.reduce((sum, line) => sum + line.quantity, 0)} items</span><strong>${money(total)}</strong></p><p><span>Shipping</span><strong id="checkout-shipping">${money(shipping)}</strong></p><p class="checkout-total"><span>ESTIMATED TOTAL</span><strong id="checkout-total">${money(total + shipping)}</strong></p><p class="cart-secure">Tax is not calculated in this preview. Connect a tax provider for live checkout.</p></div>
        <button class="button button-primary" type="submit" ${paymentReady ? "" : "disabled"}>${paymentReady ? "CONTINUE TO PAYMENT" : "PAYMENT SETUP REQUIRED"} <span>↗</span></button>
      </form>
    </div>`;
  $("#checkout-dialog").showModal();
}

function closeCheckout() {
  if ($("#checkout-dialog").open) $("#checkout-dialog").close();
}

function showConfirmation(reference) {
  $("#checkout-content").innerHTML = `<div class="confirmation"><div class="confirm-mark">✳</div><p class="eyebrow">PAYMENT CONFIRMED BY STRIPE</p><h2>THANK YOU FOR<br>SUPPORTING THE HUSTLE.</h2><p>Your payment has been confirmed. Thanks for backing the movement.</p><p>Order reference: ${reference}</p><a class="button button-primary continue-shopping" href="#collection">BACK TO THE DROP <span>↗</span></a></div>`;
  cart = [];
  saveCart();
  setBagCount();
  $(".continue-shopping").addEventListener("click", closeCheckout);
}

async function handleCheckoutReturn() {
  const url = new URL(window.location.href);
  const sessionId = url.searchParams.get("checkout_session_id");
  const cancelled = url.searchParams.get("checkout") === "cancel";
  if (!sessionId && !cancelled) return;

  if (cancelled) {
    url.searchParams.delete("checkout");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    announce("Checkout cancelled. Your bag is still saved.");
    return;
  }

  try {
    const response = await fetch(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`, {
      headers: { Accept: "application/json" }
    });
    const result = await response.json();
    if (!response.ok || result.paymentStatus !== "paid") {
      announce("Payment hasn't been confirmed. Your bag is still saved.");
      return;
    }
    url.searchParams.delete("checkout_session_id");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    showConfirmation(result.orderReference);
    $("#checkout-dialog").showModal();
  } catch (error) {
    announce("We couldn't verify the payment yet. Your bag is still saved.");
  }
}

function openMobileMenu() {
  closeCart();
  $("#mobile-menu").classList.add("open");
  $("#mobile-menu").setAttribute("aria-hidden", "false");
  $(".menu-toggle").setAttribute("aria-expanded", "true");
  document.body.classList.add("locked");
  $(".mobile-menu a").focus();
}

function closeMobileMenu() {
  $("#mobile-menu").classList.remove("open");
  $("#mobile-menu").setAttribute("aria-hidden", "true");
  $(".menu-toggle").setAttribute("aria-expanded", "false");
  if (!$("#cart-drawer").classList.contains("open")) document.body.classList.remove("locked");
}

$("#category-filter").addEventListener("change", renderProducts);
$("#size-filter").addEventListener("change", renderProducts);
$("#stock-filter").addEventListener("change", renderProducts);
$("#sort-filter").addEventListener("change", renderProducts);
$("#product-search").addEventListener("input", renderProducts);
$("#product-grid").addEventListener("click", (event) => {
  const add = event.target.closest("[data-add]");
  if (add) {
    if (add.disabled) return;
    openProduct(add.dataset.add);
    return;
  }
  const card = event.target.closest("[data-view]");
  if (card) openProduct(card.dataset.view);
});
$("#product-detail").addEventListener("click", (event) => {
  const sizeButton = event.target.closest("[data-size]");
  if (sizeButton) {
    selectedSize = sizeButton.dataset.size;
    $$(".size-option", $("#product-detail")).forEach((button) => {
      const selected = button === sizeButton;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    $(".size-error", $("#product-detail")).textContent = "";
  }
  if (event.target.closest(".size-guide-button")) {
    const details = $(".size-guide", $("#product-detail"));
    details.open = !details.open;
    event.target.setAttribute("aria-expanded", String(details.open));
  }
  if (event.target.closest(".detail-add")) {
    if (!selectedSize) {
      $(".size-error", $("#product-detail")).textContent = "Choose a size before adding this to your bag.";
      $$(".size-option", $("#product-detail"))[0].focus();
      return;
    }
    addToCart(selectedProduct, selectedSize);
  }
});
$("#cart-content").addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (remove) {
    const [id, size] = remove.dataset.remove.split("|");
    cart = cart.filter((line) => line.id !== id || line.size !== size);
    saveCart();
    renderCart();
    announce("Removed from your bag.");
  }
  const quantity = event.target.closest("[data-quantity]");
  if (quantity) {
    const [id, size, amount] = quantity.dataset.quantity.split("|");
    const line = cart.find((item) => item.id === id && item.size === size);
    if (!line) return;
    line.quantity += Number(amount);
    if (line.quantity < 1) cart = cart.filter((item) => item !== line);
    saveCart();
    renderCart();
  }
});
$("#cart-drawer").addEventListener("click", (event) => {
  if (event.target.closest(".cart-empty a")) closeCart();
});
$$(".cart-trigger").forEach((button) => button.addEventListener("click", openCart));
$(".drawer-close").addEventListener("click", closeCart);
$("#overlay").addEventListener("click", closeCart);
$(".menu-toggle").addEventListener("click", openMobileMenu);
$(".mobile-menu-close").addEventListener("click", closeMobileMenu);
$("#mobile-menu").addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMobileMenu();
});
$("#product-dialog .dialog-close").addEventListener("click", () => $("#product-dialog").close());
$(".checkout-close").addEventListener("click", closeCheckout);
$("#checkout-dialog").addEventListener("change", (event) => {
  if (event.target.name !== "shipping") return;
  const shipping = Number(event.target.value);
  $("#checkout-shipping").textContent = money(shipping);
  $("#checkout-total").textContent = money(subtotal() + shipping);
});
$("#checkout-content").addEventListener("submit", (event) => {
  if (event.target.id !== "checkout-form") return;
  event.preventDefault();
  const submit = $('button[type="submit"]', event.target);
  const notice = $(".demo-notice", $("#checkout-content"));
  if (!paymentReady) {
    notice.textContent = "Secure checkout is unavailable. Please try again later.";
    return;
  }
  const values = new FormData(event.target);
  const customer = {
    name: values.get("name"),
    email: values.get("email"),
    phone: values.get("phone"),
    address: values.get("address"),
    city: values.get("city"),
    state: values.get("state"),
    zip: values.get("zip"),
    country: { "United States": "US", Canada: "CA" }[values.get("country")]
  };
  submit.disabled = true;
  notice.textContent = "Preparing your secure Stripe checkout…";
  fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ items: cart, customer })
  }).then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Couldn't start secure checkout.");
    const checkoutUrl = new URL(result.checkoutUrl);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
      throw new Error("Stripe returned an unexpected checkout address.");
    }
    window.location.assign(checkoutUrl.href);
  }).catch((error) => {
    notice.textContent = error.message || "Couldn't start secure checkout. Please try again.";
    submit.disabled = false;
  });
});
$("#newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = $("#newsletter-email").value.trim();
  if (!email) return;
  $("#newsletter-message").textContent = "Signup preview only — connect your email platform to collect subscribers.";
  event.target.reset();
});
$("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#contact-message").textContent = "Message preview only — connect a form inbox to receive messages.";
  event.target.reset();
});
$("#cookie-accept").addEventListener("click", () => {
  try {
    localStorage.setItem("hoah-cookie-notice-dismissed", "true");
    $("#cookie-banner").classList.add("hidden");
  } catch (error) {
    console.error("Unable to save cookie notice preference.", error);
    announce("We couldn't save that preference on this device.");
  }
});
$(".search-toggle").addEventListener("click", () => {
  $("#collection").scrollIntoView({ behavior: "smooth" });
  window.setTimeout(() => $("#product-search").focus(), 350);
});
try {
  if (localStorage.getItem("hoah-cookie-notice-dismissed") === "true") $("#cookie-banner").classList.add("hidden");
} catch (error) {
  console.error("Unable to read cookie notice preference.", error);
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("#cart-drawer").classList.contains("open")) closeCart();
  if (event.key === "Escape" && $("#mobile-menu").classList.contains("open")) closeMobileMenu();
});
window.addEventListener("scroll", () => $(".site-header").classList.toggle("scrolled", window.scrollY > 25), { passive: true });
$("#year").textContent = new Date().getFullYear();
renderProducts();
renderComingSoon();
setBagCount();
refreshPaymentStatus();
handleCheckoutReturn();
