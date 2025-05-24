// Handles incoming events/calls from Microsoft Purview
import { getOAuth2 } from "../services/purviewDataTransfer.js";

export const getOAuth2Token = async (req, res) => {
    try {
        const token = await getOAuth2();
        res.status(200).json({ Purview_accessToken: token });
    } catch (error) {
        console.error("Error getting OAuth2 token:", error);
        res.status(500).json({ message: "Failed to get OAuth2 token" });
    }
}
