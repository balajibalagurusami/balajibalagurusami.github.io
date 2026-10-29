// The CV Builder's root domain serves its frontend and authenticated D1 API
// from the same Cloudflare Worker. This file contains no secrets.
// GitHub Pages keeps a separate copy of the builder, but cloud save is enabled
// only where the Cloudflare API is actually deployed.
const cvCloudHost = window.location.hostname.toLowerCase();
window.CV_CLOUD_API_URL =
  (cvCloudHost === 'aecbim.work' ||
   cvCloudHost === 'www.aecbim.work' ||
   /^cv-builder-cloud-api\.[^.]+\.workers\.dev$/.test(cvCloudHost))
    ? window.location.origin : '';
