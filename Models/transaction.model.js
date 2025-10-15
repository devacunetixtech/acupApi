const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthUser",
      required: true, // Required for transfers
    },
    description: {
      type: String,
      required: true,
      trim: true, // Remove leading/trailing whitespace
      maxlength: [500, "Description cannot exceed 500 characters"], // Optional limit
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least 1"], // Ensure positive amount
    },
    toAccountNumber: {
      type: String,
      required: true,
      trim: true,
    },
    transactionRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);