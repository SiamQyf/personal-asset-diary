const http = require('http');
const url = require('url');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET';

function exchangeCodeForTokens(code, redirectUri) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error_description || json.error || data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function driveApiRequest(path, accessToken, method = 'GET', bodyData = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.googleapis.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function getOrCreateDriveFolder(accessToken) {
  try {
    const q = encodeURIComponent("name = 'Assets Diary Storage' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const searchRes = await driveApiRequest(`/drive/v3/files?q=${q}&fields=files(id,name)`, accessToken);
    
    if (searchRes.data && searchRes.data.files && searchRes.data.files.length > 0) {
      console.log(`📁 Found existing Google Drive folder "Assets Diary Storage" (ID: ${searchRes.data.files[0].id})`);
      return searchRes.data.files[0].id;
    }

    console.log('📁 Creating new "Assets Diary Storage" folder in Google Drive...');
    const createRes = await driveApiRequest('/drive/v3/files', accessToken, 'POST', {
      name: 'Assets Diary Storage',
      mimeType: 'application/vnd.google-apps.folder'
    });

    if (createRes.data && createRes.data.id) {
      console.log(`✓ Created folder "Assets Diary Storage" (ID: ${createRes.data.id})`);
      return createRes.data.id;
    }
  } catch (e) {
    console.error('⚠️ Could not automatically create Drive folder:', e.message);
  }
  return null;
}

function updateCodeJs(refreshToken, folderId) {
  const codeJsPath = path.join(__dirname, 'code.js');
  let content = fs.readFileSync(codeJsPath, 'utf8');

  // Replace or add DEFAULT_REFRESH_TOKEN and DEFAULT_FOLDER_ID
  if (content.includes('const DEFAULT_REFRESH_TOKEN')) {
    content = content.replace(/const DEFAULT_REFRESH_TOKEN = .*/, `const DEFAULT_REFRESH_TOKEN = '${refreshToken}';`);
  } else {
    content = content.replace(
      `const DEFAULT_CLIENT_SECRET = '${CLIENT_SECRET}';`,
      `const DEFAULT_CLIENT_SECRET = '${CLIENT_SECRET}';\nconst DEFAULT_REFRESH_TOKEN = '${refreshToken}';`
    );
  }

  if (content.includes('const DEFAULT_FOLDER_ID')) {
    content = content.replace(/const DEFAULT_FOLDER_ID = .*/, `const DEFAULT_FOLDER_ID = ${folderId ? `'${folderId}'` : 'null'};`);
  } else {
    content = content.replace(
      `const DEFAULT_CLIENT_SECRET = '${CLIENT_SECRET}';`,
      `const DEFAULT_CLIENT_SECRET = '${CLIENT_SECRET}';\nconst DEFAULT_FOLDER_ID = ${folderId ? `'${folderId}'` : 'null'};`
    );
  }

  fs.writeFileSync(codeJsPath, content, 'utf8');
  console.log('✓ Successfully updated code.js with default Google Drive Refresh Token and Folder ID!');
}

async function startAuth() {
  const redirectUri = `http://127.0.0.1:${PORT}/oauth2callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  console.log('====================================================');
  console.log('⚡ Starting Automated Google Drive Connection Helper');
  console.log('====================================================\n');
  console.log(`1. Server listening on http://127.0.0.1:${PORT}`);
  console.log('2. Opening default browser for Google authorization...\n');

  const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    if (reqUrl.pathname === '/oauth2callback') {
      const code = reqUrl.query.code;
      const error = reqUrl.query.error;

      if (error || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>❌ Authorization Failed: ${error || 'No authorization code'}</h2>`);
        console.error(`❌ Authorization failed: ${error || 'No authorization code'}`);
        server.close();
        process.exit(1);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <h1 style="color: #4ade80; font-size: 32px;">✓ Google Drive Connected Successfully!</h1>
          <p style="font-size: 18px; color: #cbd5e1; margin-top: 16px;">Antigravity has automatically saved your OAuth tokens & Google Drive Folder ID into your project.</p>
          <p style="font-size: 14px; color: #94a3b8; margin-top: 8px;">You can now close this browser tab and return to Figma!</p>
        </div>
      `);

      console.log('✓ Code received! Exchanging code for tokens...');
      try {
        const tokens = await exchangeCodeForTokens(code, redirectUri);
        const refreshToken = tokens.refresh_token;
        const accessToken = tokens.access_token;

        console.log(`\n🎉 Google Drive Refresh Token:\n${refreshToken}\n`);

        let folderId = null;
        if (accessToken) {
          folderId = await getOrCreateDriveFolder(accessToken);
        }

        updateCodeJs(refreshToken, folderId);

        console.log('\n====================================================');
        console.log('🚀 SETUP COMPLETE!');
        console.log(`• Refresh Token: ${refreshToken ? 'Saved to code.js' : 'Failed'}`);
        console.log(`• Drive Folder ID: ${folderId || 'Root / None'}`);
        console.log('====================================================\n');

      } catch (err) {
        console.error('❌ Failed to exchange code for tokens:', err.message);
      } finally {
        server.close();
        process.exit(0);
      }
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Authorization URL:\n${authUrl}\n`);
    console.log('Opening Chrome for Google Drive authorization...\n');

    if (process.platform === 'win32') {
      exec(`start chrome "${authUrl}"`, (err) => {
        if (err) {
          exec(`start "" "${authUrl}"`);
        }
      });
    } else if (process.platform === 'darwin') {
      exec(`open "${authUrl}"`);
    } else {
      exec(`xdg-open "${authUrl}"`);
    }
  });
}

startAuth().catch(console.error);
