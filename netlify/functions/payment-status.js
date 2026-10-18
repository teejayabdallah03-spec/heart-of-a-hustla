"use strict";

const { jsonResponse, paymentStatus } = require("../lib/stripe");

exports.handler = async (event) => {
  return jsonResponse(200, paymentStatus(event.rawUrl));
};
