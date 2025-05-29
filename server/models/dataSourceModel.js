import mongoose from "mongoose";

const dataSourceSchema = new mongoose.Schema(
  {
    dataSourceName: {
      type: String,
      required: true,
      index: true,
    },
    dataSourceType: {
      type: String,
      required: true,
    },
    collectionName: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

dataSourceSchema.index(
    { owner: 1, dataSourceName: 1 }, 
    { unique: true }
);

export const findDataSourceByName = async (dataSourceName, ownerId) => {
  const query = { dataSourceName };
  if (ownerId) {
    query.owner = ownerId;
  }
  return DataSource.findOne({ query }).populate("owner");
};

const DataSource = mongoose.model("DataSource", dataSourceSchema);
export default DataSource;
