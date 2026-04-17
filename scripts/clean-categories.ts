import 'dotenv/config';
import { getCollection } from '../lib/mongodb';

async function main() {
  const categories = await getCollection('categories');

  const badFilter = {
    $or: [
      { id: { $in: ['', '-', null] } },
      { id: { $exists: false } },
    ],
  };

  const badRows = await categories.find(badFilter).toArray();
  console.log(`Found ${badRows.length} bad categor${badRows.length === 1 ? 'y' : 'ies'}:`);
  for (const row of badRows) {
    console.log('  -', row._id.toString(), JSON.stringify({ id: row.id, name: row.name }));
  }

  const res = await categories.deleteMany(badFilter);
  console.log(`\nRemoved ${res.deletedCount} bad categor${res.deletedCount === 1 ? 'y' : 'ies'}.`);

  const all = await categories.find({}).toArray();
  const seen = new Map<string, any[]>();
  for (const cat of all) {
    const id = String(cat.id ?? '').trim();
    if (!id) continue;
    if (!seen.has(id)) seen.set(id, []);
    seen.get(id)!.push(cat);
  }

  let duplicatesRemoved = 0;
  for (const [id, rows] of seen) {
    if (rows.length <= 1) continue;
    console.log(`\nDuplicate id "${id}" — keeping first, removing ${rows.length - 1} extras`);
    const idsToRemove = rows.slice(1).map((r) => r._id);
    const dupRes = await categories.deleteMany({ _id: { $in: idsToRemove } });
    duplicatesRemoved += dupRes.deletedCount;
  }

  if (duplicatesRemoved > 0) {
    console.log(`\nRemoved ${duplicatesRemoved} duplicate categor${duplicatesRemoved === 1 ? 'y' : 'ies'}.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
