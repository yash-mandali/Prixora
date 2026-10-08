// Ordered fallback selector lists per site. Retailers change markup often: when a site breaks,
// adjust these lists only (no logic changes). Values below are best-effort starting points -
// verify them against live pages before relying on them (see README).
export const SITE_SELECTORS = {
  amazon: {
    domains: ['amazon.in', 'amazon.com'],
    name: ['#productTitle'],
    price: ['#corePrice_feature_div .a-price .a-offscreen', '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', '.a-price .a-offscreen', '#priceblock_dealprice', '#priceblock_ourprice'],
    image: ['#landingImage', '#imgTagWrapperId img'],
    unavailable: ['#outOfStock'],
  },
  flipkart: {
    domains: ['flipkart.com'],
    name: ['span.VU-ZEz', 'span.B_NuCI', 'h1'],
    price: ['div.Nx9bqj.CxhGGd', 'div.Nx9bqj', 'div._30jeq3._16Jk6d'],
    priceAfterName: true,
    priceWaitTimeoutMs: 2500,
    image: ['img.DByuf4', 'img._396cs4'],
    unavailable: ['button._2AkmmA._2Npkh4'],
  },
  myntra: {
    domains: ['myntra.com'],
    name: ['h1.pdp-name', '.pdp-title'],
    price: ['span.pdp-price strong', '.pdp-price strong'],
    image: ['.image-grid-image'],
    unavailable: [],
  },
  croma: {
    domains: ['croma.com'],
    name: ['h1.pd-title', 'h1'],
    price: ['#pdp-product-price', 'span.amount', '.pdp-price'],
    image: ['img.pdp-image'],
    unavailable: [],
  },
};
