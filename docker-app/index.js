const http = require('http');

const PORT = 3000;
let counter = 0; // This stays in memory while the server is up

const server = http.createServer((req, res) => {
  // Use a switch or if/else to check the URL path
  if (req.url === '/getnumber') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Current number: ${counter}\n`);

  } else if (req.url === '/plus') {
    counter++; // Increment the global counter
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Number incremented! New value: ${counter}\n`);

  } else if (req.url === '/'){
	res.writeHead(200, {'Content-Type':'text/plain'});
	res.end(`Hello World!\n`);
  }
	else {
    // Standard 404 for paths we don't recognize
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Path not found\n');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Try: http://localhost:${PORT}/getnumber or http://localhost:${PORT}/plus`);
});