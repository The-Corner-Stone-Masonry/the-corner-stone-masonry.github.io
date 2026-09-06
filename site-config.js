(function defineCornerStoneConfig() {
  const business = Object.freeze({
    publicName: 'The Corner Stone Masonry',
    alternateName: 'Corner Stone Masonry',
    primaryMarket: 'Springfield, Illinois',
    businessType: 'Masonry contractor',
    websiteUrl: 'https://thecornerstonemasonry.net/',
    phone: '+1-217-816-0869',
    email: 'thecornerstonemasonryllc@gmail.com',
    contactName: 'Rogelio (Roy) Solorio',
    contactShortName: 'Roy',
    quotePolicy: 'Free quotes'
  });

  const links = Object.freeze({
    email: 'mailto:thecornerstonemasonryllc@gmail.com',
    googleBusinessProfile: 'https://maps.app.goo.gl/jtYCjoKoGrFmHQuJ7'
  });

  const forms = Object.freeze({
    // Paste the public https://formspree.io/f/FORM_ID endpoint here after creating the form.
    // Leave empty to use the text/email quote composer. Never put account API keys here.
    formspreeEndpoint: ''
  });

  window.CornerStoneConfig = Object.freeze({ business, links, forms });
})();
