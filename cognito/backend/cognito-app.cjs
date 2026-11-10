const path = require('path');
const express = require('express');
const session = require('express-session');
const { Issuer, generators } = require('openid-client');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'quantum-cognito-demo-secret-key-123456',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

let client;

// Initialize OpenID Client
async function initializeClient() {
  const issuerUrl =
    process.env.COGNITO_ISSUER ||
    'https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_VCz6yBhb4';
  const issuer = await Issuer.discover(issuerUrl);

  const clientId = process.env.COGNITO_CLIENT_ID || '5c2nu0v71qs0g0i65ejl8qdc3c';
  const clientSecret = process.env.COGNITO_CLIENT_SECRET || '';
  const redirectUri =
    process.env.COGNITO_REDIRECT_URI || 'https://d84l1y8p4kdic.cloudfront.net';

  client = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ['code'],
  });

  console.log('✅ OpenID Client initialized successfully.');
  console.log('   Issuer:', issuer.issuer);
  console.log('   Client ID:', clientId);
  console.log('   Redirect URI:', redirectUri);
}

// Authentication check middleware
const checkAuth = (req, res, next) => {
  if (!req.session.userInfo) {
    req.isAuthenticated = false;
  } else {
    req.isAuthenticated = true;
  }
  next();
};

// Home route
app.get('/', checkAuth, (req, res) => {
  res.render('home', {
    isAuthenticated: req.isAuthenticated,
    userInfo: req.session.userInfo,
  });
});

// Login route
app.get('/login', (req, res) => {
  if (!client) {
    return res.status(503).send('Cognito OpenID client is still initializing. Please reload.');
  }
  const nonce = generators.nonce();
  const state = generators.state();
  req.session.nonce = nonce;
  req.session.state = state;

  const authUrl = client.authorizationUrl({
    scope: 'email openid phone',
    state: state,
    nonce: nonce,
  });

  res.redirect(authUrl);
});

// Helper function to extract pathname from URL
function getPathFromURL(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname || '/';
  } catch (error) {
    console.error('Invalid URL:', error);
    return '/';
  }
}

// Callback route
const redirectUri =
  process.env.COGNITO_REDIRECT_URI || 'https://d84l1y8p4kdic.cloudfront.net';
const rawPath = getPathFromURL(redirectUri);
const callbackPath = rawPath === '/' ? '/callback' : rawPath;

async function handleCallback(req, res) {
  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(redirectUri, params, {
      nonce: req.session.nonce,
      state: req.session.state,
    });
    const userInfo = await client.userinfo(tokenSet.access_token);
    req.session.userInfo = userInfo;
    req.session.tokenSet = tokenSet;
    res.redirect('/');
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/');
  }
}

app.get(callbackPath, handleCallback);
if (callbackPath !== '/callback') {
  app.get('/callback', handleCallback);
}

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    const domain =
      process.env.COGNITO_DOMAIN ||
      'https://ap-southeast-2vcz6ybhb4.auth.ap-southeast-2.amazoncognito.com';
    const clientId = process.env.COGNITO_CLIENT_ID || '5c2nu0v71qs0g0i65ejl8qdc3c';
    const logoutUri = encodeURIComponent(process.env.COGNITO_LOGOUT_URI || redirectUri);
    const logoutUrl = `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
    res.redirect(logoutUrl);
  });
});

const PORT = process.env.COGNITO_APP_PORT || 5000;
initializeClient()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Amazon Cognito Node demo app listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start Cognito demo app:', err);
  });

