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
    googleBusinessProfile: 'https://maps.app.goo.gl/jtYCjoKoGrFmHQuJ7',
    facebook: 'https://www.facebook.com/cornerstonem/'
  });

  window.CornerStoneConfig = Object.freeze({ business, links });
})();
