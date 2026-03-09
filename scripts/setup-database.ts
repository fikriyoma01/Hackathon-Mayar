import { closeDbPool, getDbConfig, ensureDatabase } from "../src/lib/db";
import { readStore, resetStore } from "../src/lib/store";

async function main() {
  const mode = process.argv[2] ?? "setup";

  await ensureDatabase();

  if (mode === "reset") {
    await resetStore();
  } else {
    await readStore();
  }

  const store = await readStore();
  const config = getDbConfig();

  console.log(`Database ready on ${config.host}:${config.port}/${config.database}`);
  console.log(`Users: ${store.users.length}`);
  console.log(`Merchants: ${store.merchants.length}`);
  console.log(`Portions: ${store.portions.length}`);
  console.log(`Transactions: ${store.transactions.length}`);
  console.log(`Vouchers: ${store.vouchers.length}`);
  console.log(`Distributions: ${store.distributions.length}`);
  await closeDbPool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
