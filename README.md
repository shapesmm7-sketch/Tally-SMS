# Tally SMS Android Build Instructions

This project is ready to be built as an Android application using **Capacitor** and **Codemagic**.

## Prerequisites for Codemagic

1.  **GitHub Repository**: Upload this entire project (including the `android` folder) to a GitHub repository.
2.  **Codemagic Account**: Sign up at [codemagic.io](https://codemagic.io).

## How to Build on Codemagic

1.  **Add Application**: In Codemagic, click "Add application" and select your GitHub repository.
2.  **Select Workflow**: Codemagic will automatically detect the `codemagic.yaml` file. Select the **Android Capacitor Build** workflow.
3.  **Environment Variables**: If you have any secret keys (like Gemini API key), add them in the Codemagic UI under **Environment variables**.
    *   `GEMINI_API_KEY`: Your Google AI Studio API key.
4.  **Start Build**: Click **Start new build**.
5.  **Download APK**: Once the build finishes, you will receive an email at `tabsmrman@gmail.com` with a link to download the `.apk` file, or you can find it in the "Artifacts" section of the build page.

## Local Development (Optional)

If you have Android Studio installed, you can run the app locally:

1.  `npm install`
2.  `npm run build`
3.  `npx cap sync android`
4.  `npx cap open android` (This opens Android Studio)

## Important Notes

*   **SMS Permissions**: The app is configured to request `READ_SMS` and `RECEIVE_SMS` permissions. Google Play has strict policies for these permissions; if you intend to publish to the Play Store, ensure you follow their "SMS and Call Log Permissions" policy.
*   **Security**: The `codemagic.yaml` is configured for a debug/release build without signing. For production Play Store releases, you will need to set up **Android Code Signing** in the Codemagic UI.
