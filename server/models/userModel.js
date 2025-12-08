import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema(
  {
    UserName: { type: String, required: true, unique: true },
    Password: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const sensitive_patternSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  primary_account_number: { type: String, default: false },
  cardholder_name: { type: String, default: false },
});

const connectorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connector_id: { type: String, required: true, unique: true },
    connector_name: { type: String, required: true, unique: true },
    connector_type: { type: String, required: true },
    status: {
      type: String,
      enum: ["connected", "disconnected", "created", "configured"],
      default: "connected",
    },
  },
  { timestamps: true }
);

const syncSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sync_id: { type: String, required: true, unique: true },
    connector_id: { type: String, required: true },
    connector_name: { type: String, required: true },
    last_synced_at: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const findUserByUsername = async (username) => {
  return User.findOne({ UserName: username });
};

export const findSyncByConnectorName = async (connector_name) => {
  return Sync.findOne({ connector_name: connector_name });
};

export const CreateUser = async (newUser) => {
  const { UserName, Password } = newUser;
  const saltRounds = parseInt(process.env.BCRYPT_SALT, 10) || 12;
  const hash = bcrypt.hashSync(Password, saltRounds);

  const createdUser = await User.create({
    UserName,
    Password: hash,
  });

  return createdUser;
};

const User = mongoose.model("User", userSchema);
const Sync = mongoose.model("Sync", syncSchema);
const Connector = mongoose.model("Connector", connectorSchema);

export default { User, Sync, Connector };
