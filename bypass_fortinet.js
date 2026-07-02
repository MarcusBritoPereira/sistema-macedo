const http = require('http');
const https = require('https');

const PORT = 8080;
const TARGET_HOST = 'sistemamacedo.cloud';

http.createServer((req, res) => {
  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: { 
      ...req.headers, 
      host: TARGET_HOST,
      origin: `https://${TARGET_HOST}`,
      referer: `https://${TARGET_HOST}${req.url}`
    },
    rejectUnauthorized: false // Ignora o erro de SSL do Fortinet!
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Evita forçar redirecionamentos HTTPS locais
    const headers = { ...proxyRes.headers };
    if (headers.location && headers.location.includes('https://')) {
        headers.location = headers.location.replace(`https://${TARGET_HOST}`, `http://localhost:${PORT}`);
    }
    
    // Deleta os headers de segurança que forçam o Chrome a usar HTTPS localmente
    delete headers['strict-transport-security'];
    
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });
  
  proxyReq.on('error', (e) => {
    console.error('Erro de Proxy:', e.message);
    res.writeHead(500);
    res.end('Erro interno do Proxy: ' + e.message);
  });
}).listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 BYPASS FORTINET ATIVADO!`);
  console.log(`======================================================`);
  console.log(`Acesse o site usando o link abaixo:`);
  console.log(`👉 http://localhost:${PORT} 👈`);
  console.log(`======================================================\n`);
});
