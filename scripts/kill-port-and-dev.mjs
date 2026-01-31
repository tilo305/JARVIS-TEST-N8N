#!/usr/bin/env node

/**
 * Kill any process on port 8080, then start the dev server
 * This ensures no old dev servers are blocking the port
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { spawn } from 'child_process';

const execAsync = promisify(exec);

const PORT = 8080;
const WEBSOCKET_PORT = 3001;

async function killPortWindows(port) {
  const killedPids = new Set();
  
  try {
    // Method 1: Find processes LISTENING on the port (server processes)
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
    
    // Method 2: Also check ESTABLISHED connections (might catch more)
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`, {
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
      // No processes found
    }
    
    // Method 3: Kill any node/vite processes that might be related
    // This is more aggressive but helps catch hanging processes
    try {
      const { stdout: nodeProcesses } = await execAsync(`tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH`, {
        timeout: 2000
      });
      
      if (nodeProcesses) {
        // We could kill all node processes, but that's too aggressive
        // Instead, we'll just note them for now
      }
    } catch (err) {
      // No node processes or tasklist failed
    }
    
    // Kill all found PIDs (skip system processes)
    let killedCount = 0;
    const systemPids = new Set(['0', '4']); // PID 0 and 4 are system processes
    
    for (const pid of killedPids) {
      // Skip system processes and current process
      if (systemPids.has(pid) || pid === String(process.pid)) {
        continue;
      }
      
      try {
        await execAsync(`taskkill /F /PID ${pid}`, { timeout: 2000 });
        console.log(`✅ Killed process ${pid} on port ${port}`);
        killedCount++;
      } catch (err) {
        // Process might have already ended or be protected
        const errorMsg = err.message || String(err);
        if (!errorMsg.includes('not found') && 
            !errorMsg.includes('not running') &&
            !errorMsg.includes('critical system process')) {
          console.warn(`⚠️  Could not kill process ${pid}: ${errorMsg}`);
        }
      }
    }
    
    if (killedCount > 0) {
      // Wait longer for ports to be fully released
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`✅ Killed ${killedCount} process(es) on port ${port}\n`);
      return true;
    }
    
    return false;
  } catch (error) {
    // No process found or command failed - that's okay
    return false;
  }
}

async function killAllNodeProcesses() {
  const isWindows = process.platform === 'win32';
  if (!isWindows) return;
  
  try {
    const currentPid = process.pid;
    console.log(`🔍 Killing all node.exe processes (excluding current process ${currentPid})...`);
    
    // Get all node.exe PIDs first
    let nodePids = [];
    try {
      const { stdout } = await execAsync(`wmic process where "name='node.exe'" get processid /format:value`, {
        timeout: 3000,
        shell: true
      });
      
      if (stdout) {
        const lines = stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/ProcessId=(\d+)/);
          if (match) {
            const pid = match[1];
            // Exclude current process
            if (pid !== String(currentPid)) {
              nodePids.push(pid);
            }
          }
        }
      }
    } catch (err) {
      // wmic might not work, fall back to tasklist
      try {
        const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH`, {
          timeout: 2000,
          shell: true
        });
        
        if (stdout) {
          const lines = stdout.split('\n').filter(line => line.trim());
          for (const line of lines) {
            // CSV format: "node.exe","1234","..."
            const match = line.match(/"node\.exe","(\d+)"/);
            if (match) {
              const pid = match[1];
              if (pid !== String(currentPid)) {
                nodePids.push(pid);
              }
            }
          }
        }
      } catch {
        // If both methods fail, just try the aggressive kill and hope for the best
        // (it will kill itself but npm will restart it)
        console.log('⚠️  Could not list node processes, using aggressive kill...');
        try {
          await execAsync(`taskkill /F /IM node.exe /T`, {
            timeout: 5000,
            maxBuffer: 1024 * 1024,
            shell: true
          });
          console.log('✅ Killed all node.exe processes');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return;
        } catch {
          return;
        }
      }
    }
    
    // Kill each PID individually (excluding current process)
    if (nodePids.length > 0) {
      let killedCount = 0;
      for (const pid of nodePids) {
        try {
          await execAsync(`taskkill /F /PID ${pid}`, {
            timeout: 2000,
            shell: true
          });
          killedCount++;
        } catch (err) {
          // Process might have already ended
        }
      }
      console.log(`✅ Killed ${killedCount} node.exe process(es)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('ℹ️  No other node.exe processes found');
    }
  } catch (error) {
    const errorMsg = error.message || String(error);
    if (!errorMsg.toLowerCase().includes('not found') && 
        !errorMsg.toLowerCase().includes('not running') &&
        !errorMsg.toLowerCase().includes('no tasks') &&
        !errorMsg.toLowerCase().includes('no instance')) {
      console.warn(`⚠️  Could not kill all node processes: ${errorMsg}`);
    } else {
      console.log('ℹ️  No node.exe processes found');
    }
  }
}

async function killPort(port) {
  console.log(`🔍 Checking for processes on port ${port}...`);
  
  const isWindows = process.platform === 'win32';
  
  // First, try to kill processes on the specific port (more targeted)
  if (isWindows) {
    const killed = await killPortWindows(port);
    if (killed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return; // Successfully killed using Windows method
    }
  }
  
  // Fallback to kill-port package (cross-platform, but slower)
  try {
    const killPromise = execAsync(`npx -y kill-port ${port}`, {
      timeout: 8000, // 8 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    const { stdout, stderr } = await killPromise;
    
    if (stdout) {
      const output = stdout.trim();
      if (output) console.log(output);
    }
    if (stderr) {
      const error = stderr.trim();
      // Only show errors that aren't about "no process found"
      if (error && !error.toLowerCase().includes('no process') && !error.toLowerCase().includes('not found')) {
        console.warn(error);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`✅ Port ${port} is now free\n`);
  } catch (error) {
    // If kill-port fails (e.g., no process on port, timeout, etc.), that's okay
    const errorMsg = error.message || String(error);
    if (!errorMsg.toLowerCase().includes('no process') && 
        !errorMsg.toLowerCase().includes('not found') &&
        !errorMsg.toLowerCase().includes('timeout')) {
      console.warn(`⚠️  Could not kill port ${port}:`, errorMsg);
    } else {
      console.log(`ℹ️  Port ${port} appears to be free\n`);
    }
    // Continue anyway - the port might already be free
  }
}

function startDevServer() {
  console.log('🚀 Starting Vite dev server...\n');
  
  // Start vite in the foreground so we can see its output
  const isWindows = process.platform === 'win32';
  
  // On Windows, use cmd.exe to properly execute npx
  // On Unix, use npx directly
  let vite;
  if (isWindows) {
    vite = spawn('cmd.exe', ['/c', 'npx', 'vite'], {
      stdio: 'inherit',
      shell: false,
      cwd: process.cwd(),
      env: process.env
    });
  } else {
    vite = spawn('npx', ['vite'], {
      stdio: 'inherit',
      shell: false,
      cwd: process.cwd(),
      env: process.env
    });
  }
  
  // Handle errors
  vite.on('error', (error) => {
    console.error('❌ Failed to start Vite dev server:', error.message);
    console.error('💡 Make sure Vite is installed: npm install');
    process.exit(1);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping dev server...');
    if (vite && !vite.killed) {
      vite.kill('SIGINT');
    }
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    if (vite && !vite.killed) {
      vite.kill('SIGTERM');
    }
    process.exit(0);
  });
  
  vite.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌ Vite dev server exited with code ${code}`);
    }
    process.exit(code || 0);
  });
  
  // The spawned process will keep the parent alive via stdio: 'inherit'
}

async function verifyPortFree(port) {
  const isWindows = process.platform === 'win32';
  if (!isWindows) return true;
  
  try {
    // Only check for LISTENING connections (actual server processes)
    // Ignore ESTABLISHED/TIME_WAIT connections as they're just client connections
    const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      timeout: 1000
    });
    
    if (stdout && stdout.trim()) {
      console.warn(`⚠️  Port ${port} still has a LISTENING process. Trying one more time...`);
      // Try killing again
      await killPortWindows(port);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check again - only fail if there's still a LISTENING process
      try {
        const { stdout: checkAgain } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
          timeout: 1000
        });
        if (checkAgain && checkAgain.trim()) {
          console.error(`❌ Port ${port} is still in use by a LISTENING process.`);
          console.log(`💡 You may need to manually close the application using it.`);
          console.log(`💡 Or try: npx kill-port ${port}`);
          return false;
        }
      } catch {
        // Port is free now (no LISTENING processes)
      }
    }
    return true;
  } catch {
    // Port appears to be free (no LISTENING processes found)
    return true;
  }
}

async function main() {
  try {
    console.log('🔍 Preparing ports for development servers...\n');
    
    // Kill both ports
    await killPort(PORT);
    await killPort(WEBSOCKET_PORT);
    
    // Verify ports are actually free before starting
    const portFree = await verifyPortFree(PORT);
    const websocketPortFree = await verifyPortFree(WEBSOCKET_PORT);
    
    if (!portFree) {
      console.error(`\n❌ Cannot start dev server - port ${PORT} is still in use.`);
      console.log(`💡 Try manually closing any applications using port ${PORT}, or use a different port.`);
      process.exit(1);
    }
    
    if (!websocketPortFree) {
      console.warn(`\n⚠️  Port ${WEBSOCKET_PORT} is still in use. WebSocket proxy may fail to start.`);
      console.log(`💡 Try manually closing any applications using port ${WEBSOCKET_PORT}.`);
    }
    
    console.log('\n🚀 Starting both servers...\n');
    console.log('📝 Use "npm run dev:all" to run both servers with better output formatting\n');
    
    // Start the dev server (this will keep the process alive via stdio: 'inherit')
    startDevServer();
  } catch (error) {
    console.error('❌ Error in main:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
