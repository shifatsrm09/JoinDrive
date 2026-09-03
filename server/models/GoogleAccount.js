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

// Every list of "my connected drives" queries by userId alone.
googleAccountSchema.index({ userId: 1 });

// Guarantees at the database level that a User can never end up with
// two primary accounts, even if two requests race past the
// application-level check at the same time.
googleAccountSchema.index(
  { userId: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: { isPrimary: true },
  }
);

export default mongoose.model("GoogleAccount", googleAccountSchema);