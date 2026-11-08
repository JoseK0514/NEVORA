import { createRuntime } from "./runtime";
import { createCommerce } from "./service";
import { createHttpServer } from "./http";
const runtime = createRuntime();
const server = createHttpServer(
  createCommerce({
    store: runtime.store,
    origin: runtime.config.origin,
    uiOrigin: runtime.config.uiOrigin,
    allowedOrigins: runtime.config.allowedOrigins,
    billing: runtime.billing,
    signupEnabled: process.env.NEVORA_COMMERCE_SIGNUP_ENABLED === "true",
  }),
  runtime.config.origin,
);
server.listen(runtime.config.port, () =>
  console.log("NEVORA commerce API listening."),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    server.close(() => {
      runtime.pool.end().then(() => {
        process.exitCode = 0;
      });
    });
  });
