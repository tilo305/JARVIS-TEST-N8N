#!/usr/bin/env node

/**
 * Kill processes on ports 8080 and 3001
 * Used before starting both dev servers
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORTS = [8080, 3001];

async function killPortWindows(port) {
  const killedPids = new Set();
  
  try {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        timeout: 2000
      });
      
      if (stdout) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const match = line.trim().match(/\s+(\d+)$/);
          if (match) {
            killedPids.add(match[1]);
          }
        }
      }
    } catch (err) {
      // No LISTENING processes found
    }
    
    let killedCount = 0;
    const systemPids = new Set(['0', '4']);
    
    for (const pid of killedPids) {
      if (systemPids.has(pid) || pid === String(process.pid)) {
        continue;
      }
      
      try {
        await execAsync(`taskkill /F /PID ${pid}`, { timeout: 2000 });
        killedCount++;
      } catch (err) {
        // Process might have already ended
      }
    }
    
    if (killedCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

async function killPort(port) {
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    await killPortWindows(port);
  } else {
    try {
      await execAsync(`npx -y kill-port ${port}`, {
        timeout: 5000,
        maxBuffer: 1024 * 1024
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Port might already be free
    }
  }
}

async function main() {
  console.log('🔍 Clearing ports 8080 and 3001...\n');
  
  for (const port of PORTS) {
    await killPort(port);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('✅ Ports cleared\n');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
