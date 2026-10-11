const dns = require('dns');
const net = require('net');

const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1'];

try {
  dns.setServers(PUBLIC_DNS);
} catch (e) {
  // Ignore if setServers fails
}

const resolver = new dns.promises.Resolver();
resolver.setServers(PUBLIC_DNS);

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const originalLookup = dns.lookup;

const fastLookup = (hostname, options, callback) => {
  let cb = callback;
  let opts = options;

  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }

  if (!hostname || hostname === 'localhost' || net.isIP(hostname)) {
    return originalLookup(hostname, opts, cb);
  }

  const cached = cache.get(hostname);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (opts && opts.all) {
      return cb(null, cached.ips.map(ip => ({ address: ip, family: 4 })));
    }
    return cb(null, cached.ips[0], 4);
  }

  resolver.resolve4(hostname)
    .then(addresses => {
      if (!addresses || addresses.length === 0) {
        return originalLookup(hostname, opts, cb);
      }
      cache.set(hostname, { ips: addresses, timestamp: Date.now() });
      if (opts && opts.all) {
        return cb(null, addresses.map(ip => ({ address: ip, family: 4 })));
      }
      return cb(null, addresses[0], 4);
    })
    .catch(() => {
      originalLookup(hostname, opts, cb);
    });
};

dns.lookup = fastLookup;

module.exports = { fastLookup, resolver };
