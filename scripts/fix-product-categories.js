// Run: node scripts/fix-product-categories.js
// Fixes product documents where category is stored as a string name instead of ObjectId.

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.development' });

const CATEGORY_SLUG_MAP = {
    Car: 'car', Property: 'property', Boat: 'boat', Motorcycle: 'motorcycle',
    Bike: 'bike', Job: 'job', Electronics: 'electronics', Book: 'book',
    Furniture: 'furniture', Clothing: 'clothing', SellX: 'sellx',
};

async function fix() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sellx';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    // Build slug -> ObjectId map
    const categories = await db.collection('categories').find({}).toArray();
    const slugToId = {};
    for (const cat of categories) {
        slugToId[cat.slug] = cat._id;
    }

    // Find products with invalid category (string instead of ObjectId)
    const products = await db.collection('products').find({
        $expr: {
            $not: { $regexMatch: { input: { $toString: '$category' }, regex: /^[0-9a-fA-F]{24}$/ } }
        }
    }).toArray();

    console.log(`Found ${products.length} products with invalid category.`);

    let fixed = 0;
    for (const product of products) {
        const categoryStr = String(product.category);
        // Try direct slug lookup first
        const slug = CATEGORY_SLUG_MAP[categoryStr] || categoryStr.toLowerCase();
        const correctId = slugToId[slug];

        if (correctId) {
            await db.collection('products').updateOne(
                { _id: product._id },
                { $set: { category: correctId } }
            );
            console.log(`  Fixed: "${product.title}" -> category ${correctId}`);
            fixed++;
        } else {
            console.log(`  SKIPPED: "${product.title}" - no category found for "${categoryStr}" (slug: ${slug})`);
        }
    }

    console.log(`\nDone. Fixed ${fixed} of ${products.length} products.`);
    await mongoose.disconnect();
}

fix().catch(err => { console.error(err); process.exit(1); });
