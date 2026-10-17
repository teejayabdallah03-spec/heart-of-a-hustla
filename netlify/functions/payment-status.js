"use strict";

const { jsonResponse, paymentReady } = require("../lib/stripe");

exports.handler = async (event) => {
  return jsonResponse(200, { paymentReady: paymentReady(event.rawUrl) });
};
