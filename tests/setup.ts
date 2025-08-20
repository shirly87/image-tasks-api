import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { queue } from "../src/jobs/queue.js";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterEach(async () => {
  await queue.drain({ timeoutMs: 10000 });
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
    queue.close();
    await queue.drain({ timeoutMs: 10000 });

    await mongoose.disconnect();
    await mongod.stop();
});
