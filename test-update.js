const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const products = db.collection("products");
    const productId = "69d372285e54b274122f73ff";
    const updateData = {
      attributes: { "Хуванцар  материалтай": "" },
      brand: "",
      category: "--"
    };
    
    // Let's see if we can update a non-existent document (just to check format)
    const result = await products.updateOne(
      { _id: new ObjectId(productId) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
