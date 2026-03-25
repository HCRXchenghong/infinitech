import http from 'http';
import fs from 'fs';
import path from 'path';
import convert from 'heic-convert';

const PORT = 9899;

const server = http.createServer(async (req, res) => {
  // 健康检查
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // HEIC 转 JPEG：POST /convert，body 为 JSON { "inputPath": "xxx", "outputPath": "xxx" }
  if (req.method === 'POST' && req.url === '/convert') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { inputPath, outputPath } = JSON.parse(body);

        if (!inputPath || !fs.existsSync(inputPath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '输入文件不存在' }));
          return;
        }

        const inputBuffer = fs.readFileSync(inputPath);
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.85
        });

        const outPath = outputPath || inputPath.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
        fs.writeFileSync(outPath, Buffer.from(outputBuffer));

        // 删除原始 HEIC 文件
        if (outPath !== inputPath) {
          try { fs.unlinkSync(inputPath); } catch {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          outputPath: outPath,
          filename: path.basename(outPath)
        }));
      } catch (err) {
        console.error('转换失败:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '转换失败: ' + err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`🖼️  HEIC Converter 服务运行在端口 ${PORT}`);
});
