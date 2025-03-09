const admin = require("firebase-admin");
require("dotenv").config();

const serviceAccount = {
  type: process.env.FB_TYPE,
    projectId: process.env.FB_PROJECT_ID,
    privateKeyId: process.env.FB_PRIVATE_KEY_ID,
    privateKey: process.env.FB_PRIVATE_KEY ? process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    clientEmail: process.env.FB_CLIENT_EMAIL,
    clientId: process.env.FB_CLIENT_ID,
    authUri: process.env.FB_AUTH_URI,
    tokenUri: process.env.FB_TOKEN_URI,
    authProviderX509CertUrl: process.env.FB_AUTH_PROVIDER,
    clientC509CertUrl: process.env.FB_CLIENT_CERT
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
module.exports = { db };
