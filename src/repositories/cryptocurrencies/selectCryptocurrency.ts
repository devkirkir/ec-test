// монета вместе с последней ценой; подзапрос идёт по индексу idx_price_history_crypto_fetched
export const SELECT_CRYPTOCURRENCY = `
  SELECT
    c.id, c.cmc_id, c.symbol, c.name, c.sync_enabled, c.last_synced_at,
    ph.price AS latest_price,
    ph.fetched_at AS latest_fetched_at,
    ph.cmc_updated_at AS latest_cmc_updated_at
  FROM cryptocurrencies c
  LEFT JOIN price_history ph ON ph.id = (
    SELECT id
    FROM price_history
    WHERE cryptocurrency_id = c.id
    ORDER BY fetched_at DESC, id DESC
    LIMIT 1
  )
`;
