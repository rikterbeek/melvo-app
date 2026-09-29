import { startServer } from './server.js';

const server = await startServer();
const address = server.address();

console.log(JSON.stringify({ level: 'info', message: 'melvo-app listening', address }));
