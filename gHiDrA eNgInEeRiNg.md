# JARVIS Desktop Voice AI - Reverse Engineering Documentation
## Master the art of debugging desktop applications, from understanding code to mitigating threats

**Authors:** David Álvarez Pérez, Ravikant Tiwari  
**Adapted for:** JARVIS Desktop Voice AI Development  
**Type:** Desktop Application (NO web components)

---

## About the Authors

**David Álvarez Pérez** is a senior malware analyst and reverse engineer with over 12 years of experience in IT. He has worked on his own antivirus product, analyzed banking malware, and contributed to vulnerability research in software products like Microsoft's Windows 10 and NSA's Ghidra project. Currently working as a senior malware analyst at Gen Digital Inc.

**Ravikant Tiwari** is a senior security researcher at Microsoft with over a decade of expertise in malware analysis and reverse-engineering. His professional background includes tenures at McAfee, FireEye, and Acronis. He has authored numerous blogs and articles on threat research and holds a patent for designing novel detection mechanisms for malicious crypto miners.

---

## Desktop Preface

In the realm of cybersecurity, the ability to dissect and understand software, especially malware and vulnerable applications, is of paramount importance. For JARVIS Desktop Voice AI, Ghidra provides powerful reverse-engineering capabilities for analyzing desktop applications, Electron applications, and real-time audio processing systems.

This documentation is a comprehensive guide that not only introduces you to the core functionalities of Ghidra but also empowers you to extend its capabilities through scripting and plugin development for desktop applications. Whether you're aiming to uncover vulnerabilities in desktop software, analyze malicious code, or contribute to the Ghidra community, this guide will equip you with the skills and knowledge needed to excel in the field of desktop software reverse-engineering.

### Who This Desktop Guide Is For

This desktop guide is intended for:
- Desktop security researchers
- Desktop malware analysts
- Desktop bug hunters
- Desktop software engineers
- Desktop cybersecurity professionals or students involved in desktop software development, testing, and security analysis
- Individuals aspiring to enter the security industry as desktop malware or vulnerability researchers
- JARVIS Desktop Voice AI developers

Readers should have prior knowledge of programming in Java or Python and experience with desktop software development or application programming to fully benefit from the concepts and practical examples presented.

---

## Part 1: Desktop Introduction to Ghidra

### Chapter 1: Getting Started with Desktop Ghidra

#### Desktop WikiLeaks Vault 7

On March 7, 2017, WikiLeaks started to leak Vault 7, which became the biggest leak of confidential documents on the US Central Intelligence Agency (CIA). The existence of Ghidra was leaked in the first part of Vault 7: Year Zero.

#### Desktop NSA Release

During RSA Conference 2019 in San Francisco, Rob Joyce, senior advisor for cybersecurity at NSA, announced Ghidra and explained its unique capabilities for desktop applications:
- Team collaboration on a single desktop project feature
- The capabilities to extend and scale Ghidra for desktop applications
- The generic processor model (SLEIGH) for desktop systems
- Two working modes: interactive and non-GUI for desktop development
- Powerful analysis features

On April 4, 2019, the NSA released the source code of Ghidra on GitHub, as well as on the Ghidra website.

#### Ghidra vs IDA and Other Competitors

Current strengths of Ghidra:
- Open source and free (including its decompiler)
- Supports many architectures
- Can load multiple binaries at the same time in a project
- Allows collaborative reverse-engineering by design
- Supports big firmware images (1 GB+)
- Awesome documentation with examples and courses
- Allows version tracking of binaries

#### Installing Ghidra

Requirements:
- **Hardware:** 4 GB RAM, 1 GB storage (for installing Ghidra binaries), dual monitors (strongly recommended)
- **Software:** Java 17 64-bit Runtime and Development Kit

Download the latest version from https://ghidra-sre.org/ or compile from source using Gradle.

#### Creating a New Ghidra Project

Unlike other reverse-engineering tools, Ghidra doesn't work with files directly. Instead, Ghidra works with projects.

1. Click on File | New Project
2. Choose Non-Shared Project or Shared Project
3. Choose a project name and location
4. Import files using File | Import file (or press I)

---

### Chapter 2: Automating RE Tasks with Ghidra Scripts

#### Using Existing Scripts

Ghidra includes a true script arsenal accessible via Window | Script Manager. Scripts are categorized by folder and can be written in Java or Python.

Example script locations:
- `$USER_HOME/ghidra_scripts`
- Ghidra installation script directories

#### The Script Class

**Java Script Skeleton:**
```java
import ghidra.app.script.GhidraScript;

public class MyScript extends GhidraScript {
    @Override
    public void run() throws Exception {
        // Script implementation
    }
}
```

**Python Script Skeleton:**
```python
from ghidra.app.script import GhidraScript

class MyScript(GhidraScript):
    def run(self):
        # Script implementation
```

#### Available GhidraScript States
- `currentProgram`
- `currentAddress`
- `currentLocation`
- `currentSelection`
- `currentHighlight`

#### Script Development

Important annotations for scripts:
- `@category` - Organize scripts in Script Manager
- `@menupath` - Add script to Ghidra menu
- `@keybinding` - Assign hotkey to script

---

### Chapter 3: Ghidra Debug Mode

#### Setting Up the Development Environment

Required software:
- JDK 17 for x86_64
- Eclipse IDE for Java developers
- PyDev 6.3.1
- GhidraDev plugin

#### Debugging Ghidra Scripts from Eclipse

1. Create new Ghidra Script Project via GhidraDev | New | Ghidra Script Project
2. Configure Python support via Jython
3. Set breakpoints in Eclipse
4. Debug As | Ghidra

#### Ghidra RCE Vulnerability

**The Vulnerability:**
In Ghidra 9.0, the `DEBUG_ADDRESS` was set to `*:18001`, allowing remote debugging connections from any IP address.

**The Fix:**
```bash
DEBUG_ADDRESS="127.0.0.1:18001"
```

This restricts debugging connections to localhost only.

---

### Chapter 4: Using Ghidra Extensions

#### Types of Ghidra Extensions

1. **Analyzers** - Extend code analysis functionality
2. **Filesystems** - Support archive files (ZIP, APK, etc.)
3. **Plugins** - Extend Ghidra GUI and functionality
4. **Exporters** - Export program data in various formats
5. **Loaders** - Add support for new binary formats

#### Installing Extensions

1. File | Install Extensions
2. Select extension from Extensions folder
3. Restart Ghidra
4. Configure via File | Configure

#### Developing a Ghidra Extension

1. GhidraDev | New | Ghidra Module Project
2. Choose module templates (Analyzer, Plugin, Loader, etc.)
3. Associate Ghidra installation
4. Enable Python support if needed
5. Export via File | Export | Ghidra Module Extension

---

## Part 2: Reverse-Engineering

### Chapter 5: Reversing Malware Using Ghidra

#### Setting Up the Environment

Use VirtualBox or VMware with:
- Isolated network
- Read-only shared folders
- No internet connection for static analysis

#### Looking for Malware Indicators

**Key Analysis Steps:**
1. Look for strings (Search | For Strings)
2. Check intelligence sources (VirusTotal)
3. Analyze imported functions

**Unsafe Functions to Look For:**
- `strcpy`, `strcat` - Buffer overflow
- `malloc`, `free` - Heap operations
- `VirtualAlloc`, `VirtualProtect` - Memory manipulation
- `CreateThread`, `CreateProcess` - Process operations

#### API Hashing

Many malware samples use API hashing to hide imported functions:

```python
def getHash(apiname):
    hash = 0
    for c in apiname:
        hash = ((hash << 7) & 0xffffff00) | \
               ((0xFF & (hash << 7)) | (0xFF & (hash >> 0x19)) ^ ord(c))
    return pack('<L', hash)
```

---

### Chapter 6: Scripting Malware Analysis

#### Ghidra Flat API Reference

| Category | Functions |
|----------|-----------|
| Memory addresses | `addEntryPoint`, `getAddressFactory`, `createAddressSet` |
| Code analysis | `analyze`, `analyzeAll`, `analyzeChanges` |
| Data declaration | `createAsciiString`, `createByte`, `createDWord` |
| Data retrieval | `getInt`, `getByte`, `getBytes`, `getDataAt` |
| Functions | `getFirstFunction`, `getFunctionAt`, `createFunction` |
| Instructions | `getInstructionAt`, `disassemble` |
| References | `getReferencesFrom`, `getReferencesTo` |

#### Deobfuscating Malware with Scripts

**Example: Finding and resolving API hashes**

```java
// Get current function
Function fn = getFunctionAt(currentAddress);
Instruction i = getInstructionAt(currentAddress);

while (getFunctionContaining(i.getAddress()) == fn) {
    String mnem = i.getMnemonicString();
    if (mnem.equals("CALL")) {
        Object[] target = i.getOpObjects(0);
        if (target[0].toString().equals("EBP")) {
            // Handle obfuscated call
            int hash = getInt(currentAddress.add(
                Integer.parseInt(target[1].toString(), 16)));
            String apiName = resolveHash(hash);
            setEOLComment(i.getAddress(), apiName);
        }
    }
    i = i.getNext();
}
```

---

### Chapter 7: Using Ghidra's Headless Analyzer

#### Why Use Headless Mode?

- Analyze multiple binaries automatically
- Integrate with other tools and scripts
- Batch processing
- CI/CD pipeline integration

#### Basic Headless Command

```bash
analyzeHeadless <project_location> <project_name> -import <file> \
    -postScript <script.py> -scriptPath <path>
```

#### Creating and Populating Projects

```bash
analyzeHeadless C:\Projects MyProject -import malware.exe
```

#### Running Scripts in Headless Mode

```bash
analyzeHeadless C:\Projects MyProject -process malware.exe \
    -postScript AnalyzeAPIs.py
```

---

## Part 3: Binary Analysis

### Chapter 8: Binary Diffing

#### Using Ghidra BSim

BSim uses Ghidra's decompiler to generate feature vectors for each function based on:
- Data flow
- Control flow
- Normalized to handle different compilers/architectures

#### Setting Up BSim with Elasticsearch

1. Download and run Elasticsearch
2. Install BSim Elasticsearch plugin (lsh plugin)
3. Create BSim database:
```bash
bsim createdatabase elasticsearch://localhost/bsim_db
```

4. Add servers in Ghidra: BSim | Manage Servers

#### Populating BSim Database

```bash
bsim generatesigs ghidra://localhost/myproject \
    elasticsearch://localhost/bsim_db
```

#### Finding Similar Functions

1. Open file in CodeBrowser
2. BSim | Perform Overview
3. Right-click function | Search Selected Functions
4. Compare matching functions

---

### Chapter 9: Auditing Program Binaries

#### Memory Corruption Vulnerabilities

**Stack-based Buffer Overflow:**
```c
char buffer[200];
strcpy(buffer, argv[1]);  // Vulnerable!
```

**Heap-based Buffer Overflow:**
```c
char *buffer = malloc(10);
strcpy(buffer, input);  // Vulnerable!
```

**Format String Vulnerability:**
```c
printf(user_input);  // Vulnerable!
```

#### Finding Vulnerabilities with Ghidra

1. Filter Symbol Tree for unsafe functions:
   - `strcpy`, `strcat`, `gets`, `scanf`
   - `malloc`, `free`
   - `printf`, `sprintf`

2. Show References (Ctrl+Shift+F)
3. Analyze caller functions for proper bounds checking

#### Exploiting Stack-Based Buffer Overflow

**Exploitation Steps:**
1. Calculate offset to return address
2. Craft payload with shellcode
3. Overwrite return address to point to shellcode
4. Bypass DEP/ASLR protections

---

### Chapter 10: Scripting Binary Audits

#### P-Code Advantages

P-Code is Ghidra's intermediate representation that provides:
- Architecture-independent analysis
- Fine-grained control flow
- Single assignment property
- Support for all Ghidra-supported architectures

#### Looking for Vulnerable Functions

**Retrieving Functions from Symbols Table:**
```python
symbol_table = currentProgram.getSymbolTable()
sscanf_symbols = symbol_table.getSymbols("_sscanf")
```

#### Analyzing with P-Code

**Getting P-Code Operations:**
```python
decomp_results = decompileFunction(function, timeout)
high_func = decomp_results.getHighFunction()

for pcode_op in high_func.getPcodeOps():
    opcode = pcode_op.getOpcode()
    if opcode == PcodeOp.CALL:
        # Analyze call
```

---

## Part 4: Extending Ghidra for Advanced Reverse-Engineering

### Chapter 11: Developing Ghidra Plugins

#### Plugin Documentation

```java
@PluginInfo(
    status = PluginStatus.RELEASED,
    packageName = "MyPluginPackage",
    shortDescription = "Short description",
    description = "Detailed description"
)
public class MyPlugin extends ProgramPlugin {
    private MyProvider provider;
    
    public MyPlugin(PluginTool tool) {
        super(tool);
        provider = new MyProvider(this, getName());
    }
    
    @Override
    public void init() {
        super.init();
        // Acquire services
    }
}
```

#### Creating Plugin Provider

```java
public class MyProvider extends ComponentProviderAdapter {
    private JPanel panel;
    private JTextArea textArea;
    
    public MyProvider(Plugin plugin, String name) {
        super(plugin.getTool(), name, plugin.getName());
        buildPanel();
        createActions();
    }
    
    @Override
    public JComponent getComponent() {
        return panel;
    }
}
```

---

### Chapter 12: Incorporating New Binary Formats

#### Developing a Ghidra Loader

**Key Methods:**
- `getName()` - Return loader name
- `findSupportedLoadSpecs()` - Check if file can be loaded
- `load()` - Load file into Ghidra
- `getDefaultOptions()` - Define custom options
- `validateOptions()` - Validate options

**Example Load Method Structure:**
```java
@Override
public void load(ByteProvider provider, LoadSpec loadSpec,
                 List<Option> options, Program program,
                 TaskMonitor monitor, MessageLog log) {
    // 1. Get file bytes
    // 2. Create address space
    // 3. Process segments
    // 4. Handle relocations
    // 5. Create symbols
    // 6. Set registers
}
```

---

### Chapter 13: Analyzing Processor Modules

#### SLEIGH Language Specification

SLEIGH files in processor module:
- `*.slaspec` - Processor specification
- `*.sinc` - Instruction definitions
- `*.pspec` - Processor details
- `*.cspec` - Compiler specifications
- `*.ldefs` - Language definitions
- `*.opinion` - Load constraints

#### Processor Module Development

1. Create skeleton via GhidraDev
2. Define registers and address spaces
3. Implement instruction patterns
4. Create function patterns
5. Map DWARF registers
6. Build and test

---

## Part 5: Debugging and Applied Malware Analysis

### Chapter 16: Debugging

#### Ghidra Debugger Overview

Supported backends:
- Windows debugger (dbgeng.dll)
- GDB (GNU Debugger)
- LLDB

#### Debugger Windows

- **Connections** - Active debug sessions
- **Dynamic** - Disassembly at current PC
- **Modules** - Loaded executable images
- **Registers** - Hardware register values
- **Breakpoints** - Breakpoint management
- **Stack** - Call stack frames
- **Regions** - Memory regions
- **Watches** - Expression monitoring
- **Threads** - Process threads
- **Terminal** - Backend debugger CLI

#### Execution Control

**Stepping:**
- Step Into (F8) - Execute one instruction
- Step Over - Execute function without entering
- Step Out (F12) - Execute until return

**Breakpoints:**
- Software (SW_EXECUTE) - Patch with INT3
- Hardware (HW_EXECUTE, HW_READ, HW_WRITE) - Use debug registers

#### Remote Debugging

**Setup for Linux:**
```bash
# On target machine
gdbserver 0.0.0.0:12345 ./program

# In Ghidra
Debugger | Configure and Launch | remote gdb
# Set connection string: target_ip:12345
```

---

### Chapter 17: Unpacking in-the-Wild Malware

#### Unpacking Strategy

1. Set breakpoint on `VirtualAlloc`
2. Step out to get allocated memory address
3. Set hardware WRITE breakpoint on first byte
4. Continue execution until decryption loop
5. Set breakpoint after decryption loop
6. Dump decrypted memory

#### Key APIs for Unpacking

- `VirtualAlloc` - Allocate executable memory
- `VirtualProtect` - Change memory protection
- `CreateThread` - Execute decrypted code
- `WriteProcessMemory` - Write decrypted data

#### Dumping Decrypted Code

```
# In Ghidra debugger terminal
.writemem shellcode.bin 0x90000 0x90380
```

---

### Chapter 18: Reverse-Engineering Ransomware

#### Ransomware Working Principles

1. **Initial Infection**
   - Phishing emails
   - Malicious downloads
   - Exploit vulnerabilities

2. **Installation**
   - Mutex creation (single instance)
   - Config extraction (RC4 encrypted)
   - Privilege escalation
   - Process termination

3. **Encryption**
   - Key generation (ECDH/X25519)
   - File enumeration (I/O completion ports)
   - Salsa20/AES encryption
   - Per-file encryption keys

4. **C2 Communication**
   - Report infection
   - Key exchange
   - Data exfiltration

#### Identifying Encryption Algorithms

**Look for:**
- CryptoAPI functions (`CryptEncrypt`, `BCryptEncrypt`)
- Known constants (Salsa20: "expand 32-byte k")
- S-box values (AES)
- String patterns

**Using FindCrypt-Ghidra:**
1. Install plugin
2. Run FindCrypt.java script
3. Trace references to crypto constants

---

## Key Takeaways

1. **Ghidra is powerful** - Free, open-source, supports many architectures
2. **Scripting is essential** - Automate repetitive tasks with Python/Java
3. **P-Code enables portability** - Write once, support all architectures
4. **BSim finds similarities** - Identify known functions across binaries
5. **Debugging complements static analysis** - Use both for complete understanding
6. **Extensions expand capabilities** - Develop custom analyzers, loaders, plugins
7. **Community contribution** - Share knowledge, report bugs, submit improvements

---

## Further Learning Resources

- Ghidra Documentation: `<GhidraInstallDir>/docs/`
- Ghidra GitHub: https://github.com/NationalSecurityAgency/ghidra
- Ghidra Website: https://ghidra-sre.org/
- Ghidra Cheat Sheet: https://ghidra-sre.org/CheatSheet.html
- Telegram: https://t.me/GhidraRE
- Discord: https://discord.gg/S4tQnUB

---

*This document is a condensed technical reference from "Ghidra Software Reverse-Engineering for Beginners, Second Edition" by David Álvarez Pérez and Ravikant Tiwari, published by Packt Publishing.*


