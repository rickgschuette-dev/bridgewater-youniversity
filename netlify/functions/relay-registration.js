// netlify/functions/relay-registration.js
//
// WHY THIS FILE EXISTS:
// A POST to a Google Apps Script Web App's /exec URL does not return the
// real response directly. Google first replies with an HTTP redirect
// (302) pointing to a one-time "echo" URL, and the actual result only
// comes back from a second request to that URL. A real web browser
// handles this automatically and never notices -- in fact this is
// exactly what was observed testing the deployed Registration Apps
// Script directly in a browser on 2026-09-23: the address bar changed
// from the script.google.com/.../exec URL to a
// script.googleusercontent.com/macros/echo?... URL to show the actual
// response. Netlify's own "outgoing webhook" feature does not follow
// that redirect correctly -- it treats the redirect as a delivery
// failure. This is the same problem already diagnosed and fixed for the
// Teacher sign-up form (see relay-teacher.js) and the Framing Committee
// volunteer sign-up (see relay-forum.js).
//
// THE FIX:
// Instead of Netlify calling Google Apps Script directly, Netlify calls
// this function. This function makes the call to Apps Script itself and
// manually follows the redirect chain (a plain follow-up GET request, up
// to 3 hops) the way a browser would, then reports success or failure
// back to Netlify.
//
// WHAT TO CHANGE IF THE REGISTRATION APPS SCRIPT IS EVER REDEPLOYED WITH
// A DIFFERENT URL: update APPS_SCRIPT_URL below to the new "Web app" URL
// shown in the Apps Script editor (open the "BWU Student Class
// Registration" Google Sheet > Extensions > Apps Script) under
// Deploy > Manage deployments.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwx5jHQb_03PH0QrWXyos_6n6w6hXs7PQOqTOHFZU3USZpw3w8GH4dqYEL3UQy1gfgp/exec';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const result = await postToAppsScript(APPS_SCRIPT_URL, event.body || '');
    return {
      statusCode: 200,
      body: JSON.stringify({ relayed: true, appsScriptStatus: result.status })
    };
  } catch (err) {
    console.error('relay-registration failed: ' + err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ relayed: false, error: err.message })
    };
  }
};

// Posts to an Apps Script Web App URL and manually follows the redirect
// chain it uses to serve its real response (up to 3 hops). Letting a
// generic HTTP client auto-follow that redirect is exactly what fails --
// this does it as two separate, plain requests instead, which works
// reliably.
async function postToAppsScript(url, body) {
  const first = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body,
    redirect: 'manual'
  });

  return followRedirects(first, 3);
}

async function followRedirects(response, hopsLeft) {
  var isRedirect = response.status === 301 || response.status === 302 || response.status === 303;
  if (!isRedirect) {
    return { status: response.status, body: await response.text() };
  }
  if (hopsLeft <= 0) {
    throw new Error('Too many redirects following the Apps Script response');
  }
  var location = response.headers.get('location');
  if (!location) {
    throw new Error('Apps Script returned a redirect with no Location header');
  }
  var next = await fetch(location, { method: 'GET', redirect: 'manual' });
  return followRedirects(next, hopsLeft - 1);
}
