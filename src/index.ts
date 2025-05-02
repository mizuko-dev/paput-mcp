#!/usr/bin/env node

import { MCPServer } from './server.js';

// サーバーの実行
const server = new MCPServer();
server.run().catch((error) => {
  console.error('予期せぬエラー:', error);
  process.exit(1);
});
