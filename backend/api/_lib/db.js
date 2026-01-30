const mongoose = require('mongoose');

let cached = global.__mongoose;
if (!cached) {
  cached = global.__mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/site-tracker';
    cached.promise = mongoose.connect(mongoUri).then((mongooseInstance) => mongooseInstance);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectToDatabase };
