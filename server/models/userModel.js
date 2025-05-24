import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const userSchema = new mongoose.Schema(
  {
    UserName: { type: String, required: true, unique: true },
    Password: { type: String, required: true },
    // AccessToken: { type: String },
    // RefreshToken: { type: String }
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

const User = mongoose.model("User", userSchema);
export default User;
