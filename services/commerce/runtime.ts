import Stripe from "stripe";
import { Pool } from "pg";
import nodemailer from "nodemailer";
import { readCommerceConfig } from "./config";
import { CommerceStore } from "./store";
import { StripeBilling } from "./stripe";
import { readStripeConfig } from "./stripe-config";
import type { MailDelivery } from "./worker";
export function createRuntime(env: NodeJS.ProcessEnv = process.env,usage:'application'|'worker'='application') {
  const config = readCommerceConfig(env);
  const stripeConfig = readStripeConfig(env, config.environment,usage);
  if (
    config.environment === "production" &&
    env.NEVORA_COMMERCE_SIGNUP_ENABLED === "true" &&
    env.NEVORA_COMMERCE_MAIL_ENABLED !== "true"
  ) throw Error("signup_requires_mail_delivery");
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: usage==='worker'?2:10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    ...(usage==='worker'?{statement_timeout:15000,query_timeout:20000,lock_timeout:5000}:{}),
  });
  pool.on("error", () => {
    console.error("Commerce catalog connection unavailable.");
  });
  const store = new CommerceStore(pool, config.key,config.provisioningMode);
  let billing: StripeBilling | undefined;
  if (stripeConfig) {
    const { key, ...billingConfig } = stripeConfig;
    const client = new Stripe(key, {
      apiVersion: "2026-10-28.endive",
      timeout: 10000,
      maxNetworkRetries: 2,
    });
    billing = new StripeBilling(store, client, {
      origin: config.uiOrigin,
      ...billingConfig,
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
