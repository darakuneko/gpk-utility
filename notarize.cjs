const { notarize } = require("@electron/notarize")
require('dotenv').config()

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return
  const appName = context.packager.appInfo.productFilename

  return await notarize({
    appBundleId: "app.darakuneko.gpk-utility",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })
}