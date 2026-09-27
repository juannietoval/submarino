/**
 * Servidor HTTP local ultraligero y robusto en Node.js (Sin dependencias externas)
 * Maneja MIME types para ES Modules (.js -> application/javascript) y busca puerto libre automáticamente.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
};

const BASE_DIR = __dirname;

function createServer(port) {
    const server = http.createServer((req, res) => {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/' || reqPath === '') {
            reqPath = '/index.html';
        }

        const filePath = path.join(BASE_DIR, reqPath);

        // Seguridad: evitar directory traversal fuera de BASE_DIR
        if (!filePath.startsWith(BASE_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('403 Forbidden');
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`404 Not Found: ${reqPath}`);
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
            });

            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Puerto ${port} ocupado. Probando puerto ${port + 1}...`);
            createServer(port + 1);
        } else {
            console.error('Error del servidor:', err);
        }
    });

    server.listen(port, () => {
        const url = `http://localhost:${port}/index.html`;
        console.log(`\n======================================================`);
        console.log(`  LABORATORIO VIRTUAL DE DINAMICA SUBMARINA ACTIVO`);
        console.log(`  URL: ${url}`);
        console.log(`======================================================\n`);

        // Abrir navegador predeterminado automáticamente
        const startCmd = process.platform === 'win32' ? `start "" "${url}"` :
                         process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
        exec(startCmd);
    });
}

const START_PORT = 3000;
createServer(START_PORT);
