import { type Database } from "better-sqlite3";

function remove(db: Database) {
  const deleteStatment = db.prepare<[string]>(`
    DELETE FROM cryptocurrencies
    WHERE symbol = ?
  `);

  return (symbol: string): boolean => deleteStatment.run(symbol).changes > 0;
}

export default remove;
