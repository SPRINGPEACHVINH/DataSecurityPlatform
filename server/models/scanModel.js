import mongoose from "mongoose";

const scanDefinitionSchema = new mongoose.Schema({
  scanName: {
    type: String,
    required: true,
    index: true,
  },
  dataSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DataSource",
    required: true,
    index: true,
  },
  classificationName: {
    type: String,
    required: true,
  },
});
scanDefinitionSchema.index({ scanName: 1, dataSource: 1 }, { unique: true });

const scanRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    scanDefinition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScanDefinition",
      required: true,
    },
    scanLevel: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Queued",
      enum: ["Queued", "Running", "Completed", "Failed"],
      required: true,
    },
    result: {
      type: [String], 
      default: [],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    assetDiscovered: {
      type: Number,
      default: 0,
    },
    assetClassified: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

scanRunSchema.index({ runId: 1, status: 1 });

export const createScanDefinition = async (newscanDefinition) => {
  const { scanName, dataSourceId, classificationName } = newscanDefinition;
  if (!scanName || !dataSourceId || !classificationName) {
    throw new Error(
      "Missing required fields: scanName, dataSourceId, or classificationName."
    );
  }

  const existingScanDefinition = await ScanDefinition.findOne({
    scanName,
    dataSource: dataSourceId,
  });

  if (existingScanDefinition) {
    console.log(
      `ScanDefinition '${scanName}' already exists for DataSource ${dataSourceId}.`
    );
    return existingScanDefinition;
  }

  const createdScanDefinition = await ScanDefinition.create({
    scanName,
    dataSource: dataSourceId,
    classificationName,
  });
  return createdScanDefinition;
};

export const createScanRun = async (newScanRun) => {
  const { runId, scanDefinition, scanLevel, status, startTime } = newScanRun;
  if ((!runId || !scanDefinition || !scanLevel || !status, !startTime)) {
    throw new Error(
      "Missing required fields: runId, scanDefinition, scanLevel, status, or startTime."
    );
  }

  const existingScanRun = await ScanRun.findOne({ runId });
  if (existingScanRun) {
    console.log(`ScanRun with runId '${runId}' already exists.`);
    return existingScanRun;
  }

  const createdScanRun = await ScanRun.create({
    runId,
    scanDefinition,
    scanLevel,
    status,
    startTime,
  });
  return createdScanRun;
};

export const findScanDefinitionByName = async (scanName, dataSourceId) => {
  const query = { scanName };
  if (dataSourceId) {
    query.dataSource = dataSourceId;
  }
  return ScanDefinition.findOne(query).populate("dataSource");
};

export const findScanRunById = async (runId) => {
  return ScanRun.findOne({ runId }).populate("scanDefinition");
};

export const findByIdAndUpdateScanRun = async (runId, updateData) => {
  // Only update the fields provided in updateData
  const updatedScanRun = await ScanRun.findOneAndUpdate(
    { runId },
    { $set: updateData },
    { new: true }
  );
  if (!updatedScanRun) {
    throw new Error(`ScanRun with runId '${runId}' not found.`);
  }
  return updatedScanRun;
};

const ScanDefinition = mongoose.model("ScanDefinition", scanDefinitionSchema);
const ScanRun = mongoose.model("ScanRun", scanRunSchema);
export default { ScanRun, ScanDefinition };
