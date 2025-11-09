// api/checkout.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Pricing rules (keep in sync with frontend labels)
const PRICING = {
  base: 1499,
  extraPerson: 200,
  addons: {
    wine: 300,
    nonna: 800,
    photo: 400,
    honorary: 250,
    festival: 5000
  }
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const { travelers = 1, addons = [] } = req.body || {};

    let amount = PRICING.base + Math.max(0, Number(travelers) - 1) * PRICING.extraPerson;
    for (const key of Array.isArray(addons) ? addons : []) {
      if (PRICING.addons[key]) amount += PRICING.addons[key];
    }

    const origin = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
    const proto = (req.headers["x-forwarded-proto"] || "https");
    const baseUrl = `${proto}://${origin}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/cancel.html`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Italian Surname Journey",
              description: `Travelers: ${travelers}, add-ons: ${addons.join(", ") || "none"}`
            },
            unit_amount: Math.round(amount * 100)
          }
        }
      ]
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    res.status(400).json({ error: e.message || "Stripe error" });
  }
}
