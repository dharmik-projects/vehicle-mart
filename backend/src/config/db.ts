import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (retries = MAX_RETRIES): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        autoIndex: process.env.NODE_ENV !== 'production',
      });
      console.log(`MongoDB Connected: ${conn.connection.host} (attempt ${attempt})`);

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Will attempt to reconnect...');
      });

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed:`, (error as Error).message);

      if (attempt === retries) {
        throw new Error(`Failed to connect to MongoDB after ${retries} attempts: ${(error as Error).message}`);
      }

      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

export default connectDB;
