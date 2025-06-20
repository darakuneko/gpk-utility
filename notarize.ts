import { notarize } from "@electron/notarize";
import dotenv from 'dotenv';

dotenv.config();

interface NotarizeContext {
  electronPlatformName: string;
  appOutDir: string;
  packager: {
    appInfo: {
      productFilename: string;
    };
  };
}

async function notarizing(context: NotarizeContext): Promise<void> {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;
  const appName = context.packager.appInfo.productFilename;

  await notarize({
    tool: 'notarytool',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID!,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD!,
    teamId: process.env.APPLE_TEAM_ID!,
  } as Parameters<typeof notarize>[0]);
}

module.exports = notarizing;