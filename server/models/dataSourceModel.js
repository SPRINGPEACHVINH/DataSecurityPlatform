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

dataSourceSchema.index({ owner: 1, dataSourceName: 1 }, { unique: true });

export const createDataSource = async (newDataSource) => {
  const { dataSourceName, dataSourceType, userId } = newDataSource;
  if (!dataSourceName || !dataSourceType || !userId) {
    throw new Error(
      "Missing required fields: dataSourceName, dataSourceType, or userId."
    );
  }
  const existingDataSource = await DataSource.findOne({
    dataSourceName,
    owner: userId,
  });

  if (existingDataSource) {
    console.log(
      `DataSource '${dataSourceName}' already exists for user ${userId}.`
    );
    return existingDataSource;
  }

  const createdDataSource = await DataSource.create({
    dataSourceName,
    dataSourceType,
    owner: userId,
  });
  return createdDataSource;
};

export const findDataSourceByName = async (dataSourceName, ownerId) => {
  const query = { dataSourceName };
  if (ownerId) {
    query.owner = ownerId;
  }
  return DataSource.findOne({ query }).populate("owner");
};

export const findDataSourceByOwner = async (ownerId) => {
  return DataSource.find({ owner: ownerId }).populate("owner");
};

const DataSource = mongoose.model("DataSource", dataSourceSchema);
export default DataSource;
