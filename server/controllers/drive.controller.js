import { google } from "googleapis";

import GoogleAccount from "../models/GoogleAccount.js";
import { getAuthenticatedClient } from "../services/google.service.js";

export async function getStorage(req, res) {
  try {
    const account = await GoogleAccount.findOne({
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "No Google account connected",
      });
    }

    const auth = await getAuthenticatedClient(account._id);

    const drive = google.drive({
      version: "v3",
      auth,
    });

    const { data } = await drive.about.get({
      fields: "storageQuota",
    });

    const quota = data.storageQuota;

    return res.json({
      success: true,
      storage: {
        limit: quota.limit,
        usage: quota.usage,
        usageInDrive: quota.usageInDrive,
        usageInDriveTrash: quota.usageInDriveTrash,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch storage information",
    });
  }
}