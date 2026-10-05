import { Collection, Db, MongoClient } from "mongodb";
import User from "~/models/schemas/User.schema";
// Dùng dotenv để lấy các biến trong .env
import dotenv from "dotenv";
dotenv.config();
import RefreshToken from "~/models/schemas/RefreshToken";
import Follower from "~/models/schemas/Follower.chema";

const username = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;



const uri = `mongodb+srv://${username}:${password}@twitternodejs.efmgbpw.mongodb.net/?appName=TwitterNodeJS`;

class DatabaseService {
  private client: MongoClient;
  private db: Db;

  constructor() {
    this.client = new MongoClient(uri);
    this.db = this.client.db(dbName);
  }

  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
    }
  }

  get users(): Collection<User> {
    return this.db.collection(process.env.DB_USER_COLLECTION as string);
  }

  get refreshTokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKEN_COLLECTION as string);
  }

  get followers(): Collection<Follower> {
    return this.db.collection(process.env.DB_FOLLOWER_COLLECTION as string);
  }
}
const databaseService = new DatabaseService();
export default databaseService;