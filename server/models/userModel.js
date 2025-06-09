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

const userHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    keyword: { type: String, required: true },
    ruleName: { type: String, required: true },
    classificationName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const findUserByUsername = async (username) => {
  return User.findOne({ UserName: username });
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

export const createUserHistory = async (
  userId,
  keyword,
  ruleName,
  classificationName
) => {
  if (!userId || !keyword || !ruleName || !classificationName) {
    throw new Error(
      "Missing required fields: userId, keyword, ruleName, or classificationName."
    );
  }

  const createduserHistory = await userHistory.create({
    userId,
    keyword,
    ruleName,
    classificationName,
  });

  return createduserHistory;
};

const User = mongoose.model("User", userSchema);
const userHistory = mongoose.model("UserHistory", userHistorySchema);
export default { User, userHistory };
