"use strict";

const { createCheckout, jsonResponse } = require("../lib/stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    const response = jsonResponse(405, { error: "Method not allowed." });
    response.headers.Allow = "POST";
    return response;
  }
  return createCheckout(event);
};
