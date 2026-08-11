const http = require('http');
const url = require('url');
const https = require('https');
const { exec } = require('child_process');
const readline = require('readline');

const PORT = 3000;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n====================================================');
  console.log('⚡ Google Drive Permanent OAuth Refresh Token Helper');
  console.log('====================================================\n');
  
  const clientId = (await question('1. Enter OAuth Client ID: ')).trim();
  const clientSecret = (await question('2. Enter OAuth Client Secret: ')).trim();

  if (!clientId || !clientSecret) {
    console.error('\n❌ Both Client ID and Client Secret are required.');
    rl.close();
    process.exit(1);
  }

  console.log('\nChoose Authorization Method:');
  console.log('  [1] Automatic Browser Login (Recommended - requires redirect URI: http://127.0.0.1:3000/oauth2callback)');
  console.log('  [2] Google OAuth2 Playground (Use if Google shows "invalid request" or redirect URI error)');
  console.log('  [3] Paste Authorization Code manually\n');

  const choice = (await question('Select option (1, 2, or 3) [Default 1]: ')).trim() || '1';

  if (choice === '2') {
    await handlePlaygroundFlow(clientId, clientSecret);
  } else if (choice === '3') {
    await handleManualCodeFlow(clientId, clientSecret, `http://127.0.0.1:${PORT}/oauth2callback`);
  } else {
    await handleAutoServerFlow(clientId, clientSecret);
  }
}

async function handleAutoServerFlow(clientId, clientSecret) {
  const redirectUri = `http://127.0.0.1:${PORT}/oauth2callback`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  console.log('\n----------------------------------------------------');
  console.log('💡 IMPORTANT SETUP NOTE FOR GOOGLE CLOUD CONSOLE:');
  console.log('  - If your OAuth Client ID is a "Web application", ensure:');
  console.log(`    Authorized redirect URI includes: ${redirectUri}`);
  console.log('  - If your OAuth Client ID is a "Desktop app", it works automatically.');
  console.log('----------------------------------------------------\n');

  const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    if (reqUrl.pathname === '/oauth2callback') {
      const code = reqUrl.query.code;
      const error = reqUrl.query.error;

      if (error || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>❌ Authorization Failed: ${error || 'No authorization code'}</h2>`);
        console.error(`\n❌ Authorization failed: ${error || 'No authorization code'}`);
        server.close();
        rl.close();
        process.exit(1);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <h1 style="color: #4ade80; font-size: 28px;">✓ Google Drive Authorized Successfully!</h1>
          <p style="font-size: 16px; color: #cbd5e1; margin-top: 12px;">Close this tab and return to your terminal to view your Refresh Token.</p>
        </div>
      `);

      console.log('\n✓ Code received! Exchanging code for tokens...\n');
      try {
        const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);
        printTokensSuccess(tokens, clientId, clientSecret);
      } catch (err) {
        console.error('❌ Failed to exchange code for tokens:', err.message);
      } finally {
        server.close();
        rl.close();
        process.exit(0);
      }
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Local auth server listening on http://127.0.0.1:${PORT}`);
    console.log('Opening browser for Google Drive authorization...\n');
    
    const startCmd = process.platform === 'win32' ? `start "" "${authUrl}"` :
      process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
    exec(startCmd);
  });
}

async function handlePlaygroundFlow(clientId, clientSecret) {
  const playgroundUri = 'https://developers.google.com/oauthplayground';
  console.log('\n====================================================');
  console.log('📖 GOOGLE OAUTH PLAYGROUND INSTRUCTIONS');
  console.log('====================================================');
  console.log('1. Go to: https://developers.google.com/oauthplayground');
  console.log('2. Click the Gear icon ⚙️ (top right corner).');
  console.log('3. Check "Use your own OAuth credentials".');
  console.log(`4. Enter OAuth Client ID:\n   ${clientId}`);
  console.log(`5. Enter OAuth Client Secret:\n   ${clientSecret}`);
  console.log(`6. Under Step 1 (Select & authorize APIs), type scope:\n   ${SCOPE}`);
  console.log('7. Click "Authorize APIs" and sign in.');
  console.log('8. Under Step 2, click "Exchange authorization code for tokens".');
  console.log('9. Copy the "Refresh token" displayed in Step 2!\n');
  console.log('Paste the Refresh Token below when ready:\n');

  const refreshToken = (await question('Enter Refresh Token from Playground: ')).trim();
  if (refreshToken) {
    printTokensSuccess({ refresh_token: refreshToken }, clientId, clientSecret);
  }
  rl.close();
  process.exit(0);
}

async function handleManualCodeFlow(clientId, clientSecret, redirectUri) {
  const code = (await question('\nEnter Authorization Code: ')).trim();
  if (!code) {
    console.error('❌ No code provided.');
    rl.close();
    process.exit(1);
  }
  try {
    const tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);
    printTokensSuccess(tokens, clientId, clientSecret);
  } catch (err) {
    console.error('❌ Failed to exchange code:', err.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

function exchangeCodeForTokens(code, clientId, clientSecret, redirectUri) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
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

function printTokensSuccess(tokens, clientId, clientSecret) {
  console.log('\n====================================================');
  console.log('🎉 YOUR PERMANENT GOOGLE DRIVE CREDENTIALS');
  console.log('====================================================');
  console.log(`\nGoogle OAuth Refresh Token:\n\x1b[32m${tokens.refresh_token || '(No refresh token returned — re-run and re-approve consent)'}\x1b[0m\n`);
  console.log(`OAuth Client ID:\n${clientId}\n`);
  console.log(`OAuth Client Secret:\n${clientSecret}\n`);
  if (tokens.access_token) {
    console.log(`Drive Access Token (Temporary 1-hour):\n${tokens.access_token}\n`);
  }
  console.log('====================================================');
  console.log('Copy the Refresh Token, Client ID, and Client Secret above');
  console.log('and paste them into the Figma plugin! You will stay connected permanently.');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
