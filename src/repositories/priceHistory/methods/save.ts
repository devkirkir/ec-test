import { type Database } from "better-sqlite3";

export interface SavePrice {
  cmcId: number;
  price: number;
  cmcUpdatedAt: Date;
}

function save(db: Database) {
  const insertStatment = db.prepare<[number, string, string, number]>(`
    INSERT INTO price_history (cryptocurrency_id, price, fetched_at, cmc_updated_at)
    SELECT id, ?, ?, ?
    FROM cryptocurrencies
    WHERE cmc_id = ?
    ON CONFLICT (cryptocurrency_id, cmc_updated_at) DO NOTHING
  `);

  const updateStatment = db.prepare<[string, number]>(`
    UPDATE cryptocurrencies
    SET last_synced_at = ?
    WHERE cmc_id = ?
  `);

  const saveTransaction = db.transaction((prices: SavePrice[], fetchedAt: string) => {
    let saved = 0;

    for (const price of prices) {
      saved += insertStatment.run(price.price, fetchedAt, price.cmcUpdatedAt.toISOString(), price.cmcId).changes;

      updateStatment.run(fetchedAt, price.cmcId);
    }

    return saved;
  });

  return (prices: SavePrice[], fetchedAt: Date): number => saveTransaction(prices, fetchedAt.toISOString());
}

export default save;
