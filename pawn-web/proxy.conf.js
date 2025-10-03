const PROXY_CONFIG = {
  "/api/*": {
    target: "http://localhost:3000",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: function(proxyReq, req, res) {
      console.log('[PROXY] Proxying request:', req.method, req.url, '-> http://localhost:3000' + req.url);
    },
    onProxyRes: function(proxyRes, req, res) {
      console.log('[PROXY] Response received:', proxyRes.statusCode, req.url);
    },
    onError: function(err, req, res) {
      console.log('[PROXY] Error:', err.message, req.url);
    }
  }
};

module.exports = PROXY_CONFIG;