// netlify/functions/relay-teacher.js
//
// WHY THIS FILE EXISTS:
// A POST to a Google Apps Script Web App's /exec URL does not return the
// real response directly. Google first replies with an HTTP redirect
// (302) pointing to a one-time "echo" URL, and the actual result only
// comes back from a second request to that URL. A real web browser
// handles this automatically and never notices, but Netlify's own
// "outgoing webhook" feature does not follow that redirect correctly —
// it saw the redirect as a delivery failure, and after 6 failures in a
// row it automatically disabled the Teacher sign-up webhook. That's why
// Class Format data (and eventually everything) stopped reaching the
// "BWU Teacher Class Proposals" Google Sheet even though the underlying
// script code was correct.
//
// THE FIX:
// Instead of Netlify calling Google Apps Script directly, Netlify now
// calls this function. This function makes the call to Apps Script
// itself and manually follows the redirect chain (a plain follow-up GET
// request, up to 3 hops) the way a browser would, then reports success
// or failure back to Netlify.
//
// WHAT TO CHANGE IF THE TEACHER APPS SCRIPT IS EVER REDEPLOYED WITH A
// DIFFERENT URL: update APPS_SCRIPT_URL below to the new "Web app" URL
// shown in the Apps Script editor under Deploy > Manage deployments.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvEcPAEsWrNgdJd7CkNobSlXqM_tNf_eflQ_bAq9RFgJLvjZ-rX1PXNUOo1mftTka8_Q/exec';

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
    console.error('relay-teacher failed: ' + err.message);
    return {
      statusCode: 502,
      body: JSON.stringify({ relayed: false, error: err.message })
    };
  }
};

// Posts to an Apps Script Web App URL and manually follows the redirect
// chain it uses to serve its real response (up to 3 hops). Letting a
// generic HTTP client auto-follow that redirect is exactly what fails —
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
