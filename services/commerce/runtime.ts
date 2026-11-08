import Stripe from "stripe";
import { Pool } from "pg";
import nodemailer from "nodemailer";
import { readCommerceConfig } from "./config";
import { CommerceStore } from "./store";
import { StripeBilling } from "./stripe";
import type { MailDelivery } from "./worker";
export function createRuntime(env: NodeJS.ProcessEnv = process.env) {
  const config = readCommerceConfig(env);
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", () => {
    console.error("Commerce catalog connection unavailable.");
  });
  const store = new CommerceStore(pool, config.key);
  if (
    config.environment === "production" &&
    env.NEVORA_COMMERCE_SIGNUP_ENABLED === "true" &&
    env.NEVORA_COMMERCE_MAIL_ENABLED !== "true"
  )
    throw Error("signup_requires_mail_delivery");
  let billing: StripeBilling | undefined;
  if (env.STRIPE_SECRET_KEY) {
    const live = env.STRIPE_SECRET_KEY.startsWith("sk_live_");
    if (
      (!live && !env.STRIPE_SECRET_KEY.startsWith("sk_test_")) ||
      (live &&
        (config.environment !== "production" ||
          env.NEVORA_COMMERCE_STRIPE_LIVE_ENABLED !== "true"))
    )
      throw Error("stripe_environment_mismatch");
    if (
      !env.STRIPE_PRICE_SMALL ||
      !env.STRIPE_PRICE_TEAM ||
      !env.STRIPE_WEBHOOK_SECRET
    )
      throw Error("stripe_configuration_incomplete");
    const client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-10-28.endive",
      timeout: 10000,
      maxNetworkRetries: 2,
    });
    billing = new StripeBilling(store, client, {
      origin: config.origin,
      prices: { small: env.STRIPE_PRICE_SMALL, team: env.STRIPE_PRICE_TEAM },
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      live,
    });
  }
  let sendMail: MailDelivery = async () => {
    throw Error("mail_not_configured");
  };
  if (env.NEVORA_COMMERCE_MAIL_ENABLED === "true") {
    const port = Number(env.NEVORA_COMMERCE_SMTP_PORT ?? "465");
    if (
      ![465, 587].includes(port) ||
      !env.NEVORA_COMMERCE_SMTP_HOST ||
      !env.NEVORA_COMMERCE_SMTP_USER ||
      !env.NEVORA_COMMERCE_SMTP_PASSWORD ||
      !env.NEVORA_COMMERCE_MAIL_FROM ||
      /[\r\n]/.test(env.NEVORA_COMMERCE_MAIL_FROM)
    )
      throw Error("smtp_configuration_incomplete");
    const smtp = nodemailer.createTransport({
      host: env.NEVORA_COMMERCE_SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: {
        user: env.NEVORA_COMMERCE_SMTP_USER,
        pass: env.NEVORA_COMMERCE_SMTP_PASSWORD,
      },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    sendMail = async (message) => {
      await smtp.sendMail({
        from: env.NEVORA_COMMERCE_MAIL_FROM,
        to: message.email,
        subject:
          message.template === "verify"
            ? "Verify your NEVORA email"
            : "Your NEVORA sign-in link",
        text: `Open this single-use link to continue with NEVORA:\n\n${message.url}\n\nIf you did not request this link, you can ignore this message.`,
      });
    };
  }
  return { config, pool, store, billing, sendMail };
}
