// Data transfer service for Purview
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

const {
  PURVIEW_CLIENT_ID,
  PURVIEW_CLIENT_SECRET,
  PURVIEW_TENANT_ID,
  PURVIEW_ENDPOINT,
} = process.env;

async function getOAuth2Token() {
    const url = `https://login.microsoftonline.com/${PURVIEW_TENANT_ID}/oauth2/v2.0/token`;

    const response = await axios.post(
        url,
        qs.stringify({
            client_id: PURVIEW_CLIENT_ID,
            client_secret: PURVIEW_CLIENT_SECRET,
            scope: "https://purview.azure.net/.default",
            grant_type: "client_credentials",
        }),
        {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
    );

    return response.data.access_token;
}

export async function getOAuth2() {
    try {
        const token = await getOAuth2Token();
        return token;
    } catch (error) {
        console.error("Error getting OAuth2 token:", error);
        throw new Error("Failed to get OAuth2 token");
    }
}

