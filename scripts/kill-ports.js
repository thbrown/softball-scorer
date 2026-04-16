#!/usr/bin/env node

/**
 * Cross-platform script to kill processes on specified ports
 * Usage: node scripts/kill-ports.js 8888 8889
 */

const { execSync } = require('child_process');
const os = require('os');

const ports = process.argv.slice(2);

if (ports.length === 0) {
  console.log('Usage: node kill-ports.js <port1> [port2] [port3] ...');
  process.exit(1);
}

function killProcessOnPort(port) {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      // Windows
      try {
        const output = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        });

        const lines = output.split('\n').filter(line => line.trim());
        const pids = new Set();

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && !isNaN(pid)) {
            pids.add(pid);
          }
        });

        pids.forEach(pid => {
          try {
            execSync(`taskkill /F /PID ${pid}`, {
              stdio: 'ignore'
            });
            console.log(`✓ Killed process ${pid} on port ${port}`);
          } catch (e) {
            // Process might already be dead
          }
        });

        if (pids.size === 0) {
          console.log(`✓ No process found on port ${port}`);
        }
      } catch (e) {
        console.log(`✓ No process found on port ${port}`);
      }
    } else {
      // Unix-like (Linux, macOS)
      try {
        const output = execSync(`lsof -ti :${port}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        });

        const pids = output.trim().split('\n').filter(pid => pid);

        pids.forEach(pid => {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            console.log(`✓ Killed process ${pid} on port ${port}`);
          } catch (e) {
            // Process might already be dead
          }
        });

        if (pids.length === 0) {
          console.log(`✓ No process found on port ${port}`);
        }
      } catch (e) {
        console.log(`✓ No process found on port ${port}`);
      }
    }
  } catch (error) {
    console.log(`✓ Port ${port} is available`);
  }
}

console.log('Checking and freeing ports...');
ports.forEach(port => killProcessOnPort(port));
console.log('Done!');
