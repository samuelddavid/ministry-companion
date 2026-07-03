#!/usr/bin/env node
/**
 * Ministry Companion - One-Time Firebase Setup Script
 * Run this ONCE after creating your Firebase project.
 * 
 * Usage: node setup-firebase.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n🙏  Ministry Companion — Firebase Setup\n');
  console.log('This script will configure your Firebase project and create user accounts.\n');

  const projectId = await ask('Enter your Firebase Project ID (from Firebase Console): ');
  const apiKey = await ask('Enter your Web API Key (Project Settings → General → Web API Key): ');
  const appId = await ask('Enter your Web App ID (Project Settings → Your Apps): ');
  const messagingSenderId = await ask('Enter Messaging Sender ID: ');

  // Update firebase.js
  const firebaseConfig = `import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${projectId}.firebaseapp.com",
  projectId: "${projectId}",
  storageBucket: "${projectId}.appspot.com",
  messagingSenderId: "${messagingSenderId}",
  appId: "${appId}"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
`;

  fs.writeFileSync('./src/firebase.js', firebaseConfig);
  console.log('\n✅  firebase.js updated');

  // Update firebase.json with project
  const firebaseJson = JSON.parse(fs.readFileSync('./firebase.json', 'utf8'));
  fs.writeFileSync('./.firebaserc', JSON.stringify({ projects: { default: projectId } }, null, 2));
  console.log('✅  .firebaserc updated');

  // Create users
  console.log('\n👥  Now let\'s create user accounts.\n');
  const users = [];
  let addMore = true;

  while (addMore) {
    const name = await ask('User full name: ');
    const email = await ask('User email: ');
    const password = await ask('Password (min 6 chars): ');
    const role = await ask('Role (publisher/pioneer): ');
    users.push({ name, email, password, role });
    const cont = await ask('Add another user? (y/n): ');
    addMore = cont.toLowerCase() === 'y';
  }

  // Write users to a setup file for the admin script
  fs.writeFileSync('./users-to-create.json', JSON.stringify(users, null, 2));
  console.log(`\n✅  ${users.length} user(s) saved to users-to-create.json`);

  console.log('\n📦  Building the app...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('\n🔑  Opening Firebase login...');
  execSync('firebase login', { stdio: 'inherit' });

  console.log('\n🚀  Deploying to Firebase Hosting...');
  execSync(`firebase deploy --only hosting --project ${projectId}`, { stdio: 'inherit' });

  console.log('\n🔥  Deploying Firestore rules...');
  execSync(`firebase deploy --only firestore:rules --project ${projectId}`, { stdio: 'inherit' });

  console.log(`
✅  DEPLOYMENT COMPLETE!

Your app is live at:
  https://${projectId}.web.app

Next steps:
1. Go to Firebase Console → Authentication → Add users manually
   (or use the Firebase Admin SDK to bulk-create from users-to-create.json)
2. Each user's profile name is set on first login — you can also set it in Firestore
   under users/{uid} → { name: "Samuel David", role: "pioneer" }

Share this URL with your congregation: https://${projectId}.web.app
`);

  rl.close();
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
