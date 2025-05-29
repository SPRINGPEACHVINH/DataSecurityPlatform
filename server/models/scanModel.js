import mongoose from "mongoose";
// Removed unused import

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
    startTime: {
      type: Date,
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

export const findScanDefinitionByName = async (scanName, dataSourceId) => {
  const query = { scanName };
  if (dataSourceId) {
    query.dataSource = dataSourceId;
  }
  return ScanDefinition.findOne({ query }).populate("dataSource");
};

export const findScanRunById = async (runId) => {
  return ScanRun.findOne({ runId }).populate("scanDefinition");
};

const ScanDefinition = mongoose.model("ScanDefinition", scanDefinitionSchema);
const ScanRun = mongoose.model("ScanRun", scanRunSchema);
export default { ScanRun, ScanDefinition };
