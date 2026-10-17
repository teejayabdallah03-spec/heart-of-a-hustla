"use strict";

const { jsonResponse, verifyCheckoutSession } = require("../lib/stripe");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    const response = jsonResponse(405, { error: "Method not allowed." });
    response.headers.Allow = "GET";
    return response;
  }
  return verifyCheckoutSession(event);
};
