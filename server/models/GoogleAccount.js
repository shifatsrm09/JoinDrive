import mongoose from "mongoose";

const googleAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    googleId: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    picture: {
      type: String,
      default: "",
    },

    accessToken: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
      default: "",
    },

    expiryDate: {
      type: Number,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    connectedAt: {
      type: Date,
      default: Date.now,
    },

    lastSynced: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

googleAccountSchema.index({ userId: 1, isPrimary: 1 });

export default mongoose.model("GoogleAccount", googleAccountSchema);