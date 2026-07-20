/**
 * M3HANK Portfolio Terminal v2.0
 * Interactive Linux-style terminal for portfolio navigation.
 *
 * Architecture:
 *   Filesystem  →  Commands  →  Shell  →  Terminal Renderer
 *
 * Exports:
 *   initTerminal(containerEl)  — call once to bootstrap the terminal
 *                                (called by app.js / script.js on mode switch)
 */

// ──────────────────────────────────────────────
// FLAG DECODER (flags are base64 to prevent grep CTF{ direct finds)
// ──────────────────────────────────────────────
const _decodeB64 = s => {
  try {
    if (typeof atob === 'function') return atob(s)
    // fallback for environments without atob
    return Buffer.from(s, 'base64').toString('utf-8')
  } catch(e) {
    // Final fallback: manual base64 decoding
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    let str = ''
    for (let i = 0; i < s.length; i += 4) {
      const a = chars.indexOf(s[i]), b = chars.indexOf(s[i+1]||'='),
            c = chars.indexOf(s[i+2]||'='), d = chars.indexOf(s[i+3]||'=')
      str += String.fromCharCode((a<<2)|(b>>4))
      if (c !== 64) str += String.fromCharCode(((b&15)<<4)|(c>>2))
      if (d !== 64) str += String.fromCharCode(((c&3)<<6)|d)
    }
    return str || s
  }
}
const _d = _decodeB64 // alias for VFS (not declared in the other script)

// ──────────────────────────────────────────────
// ASCII ART
// ──────────────────────────────────────────────
const ART_BANNER = [
  ' __  __ ____  _                 _   ',
  '|  \\/  |___ \\| |               | |  ',
  '| \\  / | __) | |__   __ _ _ __ | | __',
  '| |\\/| ||__ <| \'_ \\ / _` | \'_ \\| |/ /',
  '| |  | |___) | | | | (_| | | | |   < ',
  '|_|  |_|____/|_| |_|\\__,_|_| |_|_|\\_\\',
].join('\n')

const ART_NEOFETCH = [
  '         __  __ ____  _                 _    ',
  '        |  \\/  |___ \\| |               | |   ',
  '  _ __  | \\  / | __) | |__   __ _ _ __ | | __',
  ' | \'_ \\ | |\\/| ||__ <| \'_ \\ / _` | \'_ \\| |/ /',
  ' | | | || |  | |___) | | | | (_| | | | |   < ',
  ' |_| |_||_|  |_|____/|_| |_|\\__,_|_| |_|_|\\_\\',
].join('\n')

// ──────────────────────────────────────────────
// VIRTUAL FILESYSTEM
// ──────────────────────────────────────────────

/**
 * The filesystem is a tree where each node is:
 *   { type: 'dir'|'file', content?: string|(() => string|string[]), children?: {...} }
 *
 * content can be a string OR a function that returns string|string[] (lazy/async).
 * Files whose content is a function are resolved at read time.
 */
const VFS = {
  '/': {
    type: 'dir',
    children: {
      about: { type: 'dir', children: {
        education: { type: 'file', content: () => [
          '',
          '  ┌─ Education ───────────────────────────────┐',
          '  │  B.Tech in Cyber-Security                 │',
          '  │  Parul University (2020 – 2024)           │',
          '  └───────────────────────────────────────────┘',
          '',
        ].join('\n') },
        experience: { type: 'file', content: () => [
          '',
          '  ┌─ Experience ─────────────────────────────┐',
          '  │  Security Analyst — Forensic Cybertech   │',
          '  │  Feb 2026 – Present                      │',
          '  │                                          │',
          '  │  Secure Code Reviewer — Haksec (Remote)  │',
          '  │  Oct 2023 – Feb 2026                     │',
          '  │                                          │',
          '  │  Cyber-Security Intern — TechDefence     │',
          '  │  Dec 2023 – Mar 2024                     │',
          '  └──────────────────────────────────────────┘',
          '',
        ].join('\n') },
        index: { type: 'file', content: () => [
          '',
          '  Hey, I\'m Mehank Kadu.',
          '  Security Analyst & Experienced Secure Code Reviewer',
          '  and Bug-Bounty Hunter.',
          '  Skilled in Python, Go, and JavaScript with a focus on',
          '  automation and secure coding.',
          '',
          '  Sub-directories:  education/  experience/',
          '',
          '  Quick commands:  whoami  |  neofetch',
          '',
        ].join('\n') },
      } },
      blogs: { type: 'dir', children: {
        '.how-to-read': { type: 'file', content: '  Use "blogs" to list posts, or "read <slug>" to view one.' },
      }, _children: () => {
        const posts = window.M3HANK?.blogPosts || []
        const entries = {}
        for (const p of posts) {
          entries[p.slug + '.md'] = { type: 'file', content: `  Blog: ${p.title}\n  Date: ${p.date}\n  Use: read ${p.slug}` }
        }
        return entries
      } },
      projects: { type: 'dir', children: {
        '.how-to-view': { type: 'file', content: '  Use "projects" to view the full list with descriptions.' },
      }, _children: () => {
        const projs = window.M3HANK?.projects || []
        const entries = {}
        for (const p of projs) {
          entries[p.name] = { type: 'file', content: `  ${p.name}\n  ${p.description}\n  ${p.url || ''}` }
        }
        return entries
      } },
      skills: { type: 'file', content: [
        '',
        '  ┌─ Skills & Tools ─────────────────────────────┐',
        '  │  Languages:   Python, Go, JavaScript, Bash   │',
        '  │  Security:    Web App Pentesting, Code       │',
        '  │               Review, Bug Bounty Hunting     │',
        '  │  Tools:       Burp Suite, Nmap, Metasploit,  │',
        '  │               Wireshark, Git                 │',
        '  │  Frameworks:  Node.js, React, TailwindCSS    │',
        '  └──────────────────────────────────────────────┘',
        '',
      ].join('\n') },
      social: { type: 'file', content: [
        '',
        '  ┌─ Social ─────────────────────────────────────┐',
        '  │  LinkedIn:  https://linkedin.com/in/m3hank   │',
        '  │  GitHub:    https://github.com/M3hank        │',
        '  │  Email:     m3hank1337@gmail.com             │',
        '  └──────────────────────────────────────────────┘',
        '',
      ].join('\n') },
      contact: { type: 'file', content: [
        '',
        '  ┌─ Contact ────────────────────────────────────┐',
        '  │  Email:    m3hank1337@gmail.com              │',
        '  │  LinkedIn: https://linkedin.com/in/m3hank    │',
        '  │  GitHub:   https://github.com/M3hank         │',
        '  └──────────────────────────────────────────────┘',
        '',
      ].join('\n') },
      README: { type: 'file', content: [
        '',
        '  Welcome to M3hank\'s Portfolio Terminal!',
        '',
        '  This terminal lets you explore my profile, projects,',
        '  and blog posts through a command-line interface.',
        '',
        '  Quick start:',
        '    help       — list all commands',
        '    whoami     — about me',
        '    projects   — view my tools',
        '    blogs      — list blog posts',
        '    gui        — switch to graphical view',
        '',
      ].join('\n') },

      // ── Easter eggs ──
      '.secret': { type: 'dir', children: {
        'flag.txt': { type: 'file', content: (() => {
          const f = _d('Q1RGe3RoM19odW50M3JfYjNjMG0zc190aDNfaHVudDNkfQ==')
          return [
            '',
            '  🏁  FLAG FOUND',
            '  ─────────────────────────',
            '',
            `  ${f}`,
            '',
            '  Congratulations, agent.',
            '  You found my secret.',
            '  But the hunt doesn\'t end here...',
            '',
            '  Hint: Check the source, always.',
            '',
          ].join('\n')
        })() },
        'note.txt': { type: 'file', content: [
          '',
          '  This directory shouldn\'t exist.',
          '  If you\'re reading this, you\'re either very good',
          '  or very nosy.',
          '',
          '  There are more secrets hidden in this system.',
          '  Try looking where files hide best.',
          '  And remember — not everything is in the help menu.',
          '',
        ].join('\n') },
      } },

      '.challenge': { type: 'dir', children: {
        'encoded': { type: 'file', content: [
          '',
          '  55 45 64 54 65 33 4d 77 5a 54 4e 68 5a 6a 46 77',
          '  5a 6c 38 78 5a 6c 38 30 65 58 6c 66 4e 47 38 77',
          '  61 47 64 66 63 54 4e 6e 4e 44 46 35 5a 6e 30 3d',
          '',
        ].join('\n') },
      } },

      '.bash_history': { type: 'file', content: [
        'whoami',
        'neofetch',
        'ls -la',
        'cd /etc',
        'cat passwd',
        'nmap -sV -p 22,80,443 target.com',
        'sudo nmap -O target.com',
        'grep -r "api_key" . --include="*.env"',
        'git log --oneline --all',
        'curl -X POST https://api.target.com/v1/admin -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.dGVzdA.abc123"',
        'cat ~/.ssh/id_rsa',
        'ssh -i id_rsa root@10.10.10.1',
        'python3 -c "import os; os.system(\'/bin/bash\')"',
        'exit',
      ].join('\n') },

      '.ssh': { type: 'dir', children: {
        'id_rsa': { type: 'file', content: [
          '-----BEGIN OPENSSH PRIVATE KEY-----',
          'b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn',
          'NhAAAAAwEAAQAAAQEA6wXJ6T5J6a5Z7X8p9z0q2wR4v3y8n7m4k1j0h9g8f7d6s5a4z3x',
          '2w1vYmFua2FyYW8xMjM0NTY3ODkwIEl0J3MgYSBmYWtlIGtleSwgZGlkIHlvdSByZWFs',
          'bHkgdGhpbmsgSSB3b3VsZCBsZWF2ZSBhIHJlYWwgb25lIGhlcmU/IE5pY2UgdHJ5ID4+',
          'PUwEAAAAAAAAAAQAAAQEA6wXJ6T5J6a5Z7X8p9z0q2wR4v3y8n7m4k1j0h9g8f7d6s5a4',
          '-----END OPENSSH PRIVATE KEY-----',
          '',
          '  (This key is fake. If it weren\'t, I\'d have bigger problems.)',
        ].join('\n') },
        'authorized_keys': { type: 'file', content: [
          'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDrBcnpPknprlnXvyn3PSrbBHi/fL xm4aUj0h9g8f7d6s5a4z3x2w1vbWFpbkBtM2hhbmsuZGV2 fake-key-for-portfolio',
          '',
          '# No actual keys here. This is a portfolio, not a server.',
        ].join('\n') },
      } },

      etc: { type: 'dir', children: {
        passwd: { type: 'file', content: [
          'root:x:0:0:root:/root:/bin/bash',
          'daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin',
          'bin:x:2:2:bin:/bin:/usr/sbin/nologin',
          'm3hank:x:1000:1000:Mehank Kadu,,,:/home/m3hank:/bin/bash',
          '',
          '  👀 Interesting... looks like there\'s a user named m3hank.',
          '  But you already knew that, didn\'t you?',
        ].join('\n') },
        hosts: { type: 'file', content: [
          '127.0.0.1    localhost',
          '127.0.0.1    m3hank.github.io',
          '127.0.0.1    portfolio.local',
          '',
          '# The following lines are desirable for IPv6 capable hosts',
          '::1          localhost ip6-localhost ip6-loopback',
          'ff02::1      ip6-allnodes',
          'ff02::2      ip6-allrouters',
          '',
          '# -- Intentionally left blank --',
        ].join('\n') },
        'shadow': { type: 'file', content: [
          'root:!:19876:0:99999:7:::',
          'm3hank:$6$rounds=656000$MySaltValue$KrB3o8N3FakeHashHere:19876:0:99999:7:::',
          '',
          '  ⚠  Nice try. That hash is fake. Even if it weren\'t,',
          '  ⚠  you\'d need a lot more than John to crack it.',
        ].join('\n') },
      } },

      proc: { type: 'dir', children: {
        version: { type: 'file', content: '  PortfolioOS v2.0 (m3hank-sh 1.0) #1 SMP PREEMPT_DYNAMIC (terminal-2026)' },
        cpuinfo: { type: 'file', content: [
          'processor	: 0',
          'vendor_id	: GenuineASCII',
          'cpu family	: 6',
          'model		: Portfolio',
          'model name	: M3HANK Terminal Processor (Virtual)',
          'stepping	: 1',
          'cpu MHz		: 2400.000',
          'cache size	: 256 KB',
          'bogomips	: 4200.00',
          'flags		: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr',
        ].join('\n') },
        uptime: { type: 'file', content: () => {
          const secs = Math.floor((Date.now() - (this?._bootTime || Date.now())) / 1000)
          return `  ${secs}.00 420.00`
        } },
        meminfo: { type: 'file', content: [
          'MemTotal:        2048000 kB',
          'MemFree:         1024000 kB',
          'MemAvailable:    1536000 kB',
          'Buffers:          128000 kB',
          'Cached:           512000 kB',
          'SwapTotal:        512000 kB',
          'SwapFree:         480000 kB',
        ].join('\n') },
      } },

      'home': { type: 'dir', children: {
        'm3hank': { type: 'dir', children: {
          '.env': { type: 'file', content: [
            '# Environment Configuration',
            'export PATH="/usr/local/bin:$PATH"',
            'export EDITOR="vim"',
            'export SHELL="/bin/bash"',
            '# export API_KEY="sk-you-wish-you-found-this"',
          ].join('\n') },
          '.gitconfig': { type: 'file', content: [
            '[user]',
            '\tname = Mehank Kadu',
            '\temail = m3hank1337@gmail.com',
            '[alias]',
            '\thack = !echo "If only it were that easy."',
          ].join('\n') },
        } },
      } },
    },
  },
}

// ─── FILESYSTEM HELPERS ───

function getNode(path) {
  const parts = path.replace(/^\/+/, '').replace(/\/+$/, '').split('/').filter(Boolean)
  let node = VFS['/']
  for (const part of parts) {
    if (node.type !== 'dir') return null
    // Check static children first
    if (node.children?.[part]) {
      node = node.children[part]
      continue
    }
    // Check dynamic children (from _children function)
    if (typeof node._children === 'function') {
      const dynamicKids = node._children()
      if (dynamicKids[part]) {
        node = dynamicKids[part]
        continue
      }
    }
    return null
  }
  return node
}

function resolvePath(cwd, raw) {
  if (!raw || raw === '~') return '/'
  if (raw.startsWith('/')) return normalizePath(raw)

  const combined = cwd.endsWith('/') ? cwd + raw : cwd + '/' + raw
  return normalizePath(combined)
}

function normalizePath(path) {
  const parts = path.replace(/^\/+/, '').replace(/\/+$/, '').split('/').filter(Boolean)
  const resolved = []
  for (const p of parts) {
    if (p === '.') continue
    if (p === '..') { resolved.pop(); continue }
    resolved.push(p)
  }
  return '/' + resolved.join('/')
}

function isDir(path) {
  const node = getNode(path)
  return node?.type === 'dir'
}

function listDir(path) {
  const node = getNode(path)
  if (!node || node.type !== 'dir') return null

  // Collect static children
  const children = {}
  if (node.children) Object.assign(children, node.children)

  // Collect dynamic children
  if (typeof node._children === 'function') {
    Object.assign(children, node._children())
  }

  const names = Object.keys(children)
  const dirs = names.filter(n => children[n].type === 'dir').sort()
  const files = names.filter(n => children[n].type === 'file').sort()
  return { all: [...dirs, ...files], dirs, files }
}

function resolveContent(node) {
  if (!node || node.type !== 'file') return null
  if (typeof node.content === 'function') return node.content()
  return node.content
}

// ──────────────────────────────────────────────
// TERMINAL CORE
// ──────────────────────────────────────────────

class TerminalEngine {
  constructor(containerEl) {
    this.el = containerEl
    this.outputEl = containerEl.querySelector('#term-output')
    this.inputEl = containerEl.querySelector('#term-input')
    this.promptEl = containerEl.querySelector('#term-prompt')

    // State
    this.cwd = '/'
    this.prevDir = '/'
    this.commandHistory = []
    this.historyPos = 0 // points past the last item (= fresh input)
    this.draftInput = ''
    this.outputLines = [] // each element: { text: string, class?: string }
    this.booted = false
    this.busy = false
    this.matrixActive = false
    this.matrixRain = null

    // Bind handlers
    this._onKeydown = this._handleKeydown.bind(this)
    this._onClick = this._handleClick.bind(this)
  }

  // ─── INIT ───

  init() {
    this.inputEl.addEventListener('keydown', this._onKeydown)
    this.el.addEventListener('click', this._onClick)
    this.historyPos = 0

    // if not booted yet, show boot sequence
    if (!this.booted) {
      this.bootSequence()
    } else {
      // already booted — just render current state + prompt
      this.renderAll()
      this.focus()
    }
  }

  destroy() {
    this.inputEl.removeEventListener('keydown', this._onKeydown)
    this.el.removeEventListener('click', this._onClick)
    if (this.matrixRain) {
      this.matrixRain.stop()
      this.matrixRain = null
      this.matrixActive = false
    }
  }

  focus() {
    // Small delay so any click that just gave focus doesn't immediately re-focus
    setTimeout(() => this.inputEl?.focus(), 50)
  }

  // ─── BOOT SEQUENCE ───

  async bootSequence() {
    this.booted = true
    this.busy = true
    this.clearOutput()

    const lines = [
      { text: '[  OK  ] Initializing system…', delay: 180 },
      { text: '[  OK  ] Loading kernel modules', delay: 140 },
      { text: '[  OK  ] Mounting virtual filesystem', delay: 220 },
      { text: '[  OK  ] Starting shell service', delay: 160 },
      { text: '[  OK  ] Establishing connection to m3hank.sh', delay: 280 },
      { text: '[  OK  ] Ready.', delay: 120 },
    ]

    for (const l of lines) {
      await this._sleep(l.delay)
      this._addLine(l.text, 'term-boot-line')
      this._scrollBottom()
    }

    await this._sleep(250)
    this.busy = false
    // Show quick-start navigation hints
    this._addLine('')
    this._addLine('  ── Quick start ──', 'term-boot-line')
    this._addLine('')
    this._addLine('    help         Show all commands')
    this._addLine('    ls           List files & directories')
    this._addLine('    ls -a        Show hidden files')
    this._addLine('    cd <dir>     Change directory')
    this._addLine('    cat <file>   View a file')
    this._addLine('    whoami       About me')
    this._addLine('    projects     My tools')
    this._addLine('    gui          Back to main site')
    this._addLine('')

    this._renderPrompt()
    this._scrollBottom()
  }

  // ─── RENDERING ───

  renderAll() {
    // Re-render all output lines (useful after re-focusing)
    this.outputEl.innerHTML = ''
    for (const line of this.outputLines) {
      const div = document.createElement('div')
      div.textContent = line.text
      if (line.class) div.className = line.class
      this.outputEl.appendChild(div)
    }

    // Update prompt to reflect cwd
    this._updatePromptDisplay()
    this._scrollBottom()
  }

  clearOutput() {
    this.outputLines = []
    this.outputEl.innerHTML = ''
  }

  _addLine(text, className) {
    this.outputLines.push({ text, class: className })
    const div = document.createElement('div')
    div.textContent = text
    if (className) div.className = className
    this.outputEl.appendChild(div)
  }

  _addLines(lines, className) {
    // lines can be a single string (split by \n) or an array
    const arr = Array.isArray(lines) ? lines : lines.split('\n')
    for (const line of arr) {
      this._addLine(line, className)
    }
  }

  _renderPrompt() {
    this._updatePromptDisplay()
  }

  _updatePromptDisplay() {
    const short = this.cwd === '/' ? '~' : '~' + this.cwd
    this.promptEl.textContent = `m3hank@portfolio:${short}$`
  }

  _scrollBottom() {
    this.outputEl.scrollTop = this.outputEl.scrollHeight
  }

  _sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
  }

  // ─── INPUT HANDLING ───

  _handleKeydown(e) {
    if (this.busy) {
      e.preventDefault()
      return
    }

    const input = this.inputEl

    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        this._submitCommand(input.value)
        break

      case 'Tab':
        e.preventDefault()
        this._autocomplete(input)
        break

      case 'ArrowUp':
        e.preventDefault()
        this._historyPrev(input)
        break

      case 'ArrowDown':
        e.preventDefault()
        this._historyNext(input)
        break

      case 'l':
        if (e.ctrlKey) {
          e.preventDefault()
          this.clearOutput()
          this._renderPrompt()
        }
        break

      case 'c':
        if (e.ctrlKey) {
          e.preventDefault()
          // Cancel current — clear the input line, show ^C
          input.value = ''
          this._addLine('^C')
          this._renderPrompt()
          this._scrollBottom()
        }
        break
    }
  }

  _handleClick() {
    this.focus()
  }

  // ─── COMMAND EXECUTION ───

  async _submitCommand(raw) {
    const trimmed = raw.trim()

    // Show the command in the output
    this._updatePromptDisplay()
    const short = this.promptEl.textContent.replace('m3hank@portfolio:', '').replace('$', '')
    const promptStr = `m3hank@portfolio:${short}$ ${raw}`
    this._addLine(promptStr, 'term-input-line')

    // Clear input
    this.inputEl.value = ''
    this._scrollBottom()

    if (!trimmed) {
      this._renderPrompt()
      return
    }

    // Add to history
    this.commandHistory.push(trimmed)
    this.historyPos = this.commandHistory.length

    // Parse
    const args = this._parseArgs(trimmed)
    const cmdName = args[0]
    const cmdArgs = args.slice(1)

    // Look up command
    const cmd = this._getCommand(cmdName)

    if (!cmd) {
      this._addLine(`  bash: ${cmdName}: command not found`, 'term-error')
      this._renderPrompt()
      this._scrollBottom()
      return
    }

    // Execute
    this.busy = true
    try {
      const result = await cmd.handler(cmdArgs, this)
      if (result && result.length) {
        this._addLines(result)
      }
    } catch (err) {
      this._addLine(`  error: ${err.message || 'unexpected error'}`, 'term-error')
    }
    this.busy = false

    this._renderPrompt()
    this._scrollBottom()
  }

  _parseArgs(input) {
    const args = []
    let current = ''
    let inQuote = false
    let quoteChar = ''

    for (const ch of input) {
      if (inQuote) {
        if (ch === quoteChar) {
          inQuote = false
          args.push(current)
          current = ''
        } else {
          current += ch
        }
      } else if (ch === '"' || ch === "'") {
        inQuote = true
        quoteChar = ch
      } else if (ch === ' ') {
        if (current) {
          args.push(current)
          current = ''
        }
      } else {
        current += ch
      }
    }
    if (current) args.push(current)
    return args
  }

  _getCommand(name) {
    return COMMANDS[name] || null
  }

  // ─── HISTORY ───

  _historyPrev(input) {
    if (this.historyPos === this.commandHistory.length) {
      this.draftInput = input.value
    }
    if (this.historyPos > 0) {
      this.historyPos--
      input.value = this.commandHistory[this.historyPos]
    }
  }

  _historyNext(input) {
    if (this.historyPos < this.commandHistory.length) {
      this.historyPos++
      if (this.historyPos === this.commandHistory.length) {
        input.value = this.draftInput || ''
      } else {
        input.value = this.commandHistory[this.historyPos]
      }
    }
  }

  // ─── AUTOCOMPLETE ───

  _autocomplete(input) {
    const value = input.value
    const parts = value.split(/\s+/)
    const isFirstToken = !value.includes(' ')

    let matches = []

    if (isFirstToken) {
      // Complete command name
      const names = Object.keys(COMMANDS)
      matches = names.filter(n => n.startsWith(value))
    } else {
      // Complete path (last token)
      const lastPart = parts[parts.length - 1] || ''
      const prefix = parts.slice(0, -1).join(' ') + ' '

      // Determine base directory
      let baseDir
      if (lastPart.startsWith('/')) {
        baseDir = this._dirname(lastPart)
      } else {
        const relativeBase = this._dirname(lastPart) || '.'
        baseDir = relativeBase === '.' ? this.cwd : resolvePath(this.cwd, relativeBase)
      }

      const partial = lastPart.startsWith('/')
        ? lastPart.split('/').pop() || ''
        : lastPart.split('/').pop() || ''
        // Actually the "partial" = the last segment being typed
      const partialName = lastPart.split('/').pop() || ''
      const dirToList = lastPart.startsWith('/')
        ? (lastPart.endsWith('/') ? lastPart : this._dirname(lastPart))
        : (lastPart.includes('/') ? resolvePath(this.cwd, this._dirname(lastPart)) : this.cwd)

      const listing = listDir(dirToList)
      if (listing) {
        const all = [...listing.dirs.map(d => d + '/'), ...listing.files]
        matches = all.filter(n => {
          const base = n.endsWith('/') ? n.slice(0, -1) : n
          return base.startsWith(partialName)
        }).map(n => prefix + n)
      }
    }

    if (matches.length === 0) {
      // Beep
      return
    }

    if (matches.length === 1) {
      input.value = matches[0]
      // Add trailing space for commands, keep / for dirs
      if (matches[0].endsWith('/')) {
        // keep /
      } else if (isFirstToken) {
        input.value += ' '
      }
      return
    }

    // Multiple matches — show them
    const commonPrefix = this._commonPrefix(matches)
    if (commonPrefix && commonPrefix.length > value.length) {
      input.value = commonPrefix
    } else {
      // Show alternatives
      this._addLine(value) // echo what user typed (as prompt-less line)
      this._addLine('  ' + matches.join('  '))
      this._renderPrompt()
    }
  }

  _dirname(path) {
    const parts = path.replace(/\/$/, '').split('/')
    parts.pop()
    return parts.join('/') || '/'
  }

  _commonPrefix(strings) {
    if (!strings.length) return ''
    let prefix = strings[0]
    for (let i = 1; i < strings.length; i++) {
      while (strings[i].indexOf(prefix) !== 0) {
        prefix = prefix.slice(0, -1)
        if (!prefix) return ''
      }
    }
    return prefix
  }

  // ─── PUBLIC HELPERS (used by command handlers) ───

  addOutput(text) {
    this._addLine(text)
    this._scrollBottom()
  }

  addOutputLines(lines) {
    this._addLines(lines)
    this._scrollBottom()
  }
}

// ──────────────────────────────────────────────
// COMMAND HANDLERS
// ──────────────────────────────────────────────

const COMMANDS = {}

// --- help ---
COMMANDS.help = {
  desc: 'Display this help message',
  async handler(args, term) {
    const lines = [
      '',
      '  ╔══════════════════════════════════════════════╗',
      '  ║         M3HANK Terminal — Command Help       ║',
      '  ╚══════════════════════════════════════════════╝',
      '',
      '  ── Navigation ──',
    ]

    const cmdList = [
      ['help', 'Display this help message'],
      ['ls [path]', 'List directory contents'],
      ['cd [path]', 'Change directory'],
      ['pwd', 'Print working directory'],
      ['cat <file>', 'Display file contents'],
      ['clear', 'Clear the terminal'],
      ['history', 'Show command history'],
      '',
      '  ── Profile ──',
      ['whoami', 'Display user information'],
      ['neofetch', 'Display system info'],
      ['skills', 'Show technical skills'],
      ['banner', 'Display the ASCII art header'],
      '',
      '  ── Content ──',
      ['projects', 'List projects and tools'],
      ['blogs', 'List blog posts'],
      ['read <slug>', 'Read a blog post'],
      '',
      '  ── Utilities ──',
      ['echo <text>', 'Print a message'],
      ['date', 'Display current date and time'],
      ['uptime', 'Show session uptime'],
      ['theme', 'Toggle light/dark mode'],
      ['gui', 'Switch to GUI mode'],
      ['exit', 'Exit terminal and return to GUI'],
      '',
      '  ── Easter Eggs ──',
      ['sudo', 'Try to run as root (IP grab)'],
      ['su', 'Try to switch users'],
      ['ssh', 'Remote connection attempt'],
      ['nmap', 'Port scanning simulation'],
      ['matrix', 'The Matrix has you…'],
      '',
    ]

    for (const item of cmdList) {
      if (typeof item === 'string') {
        lines.push(item)
      } else {
        const padding = ' '.repeat(Math.max(1, 22 - item[0].length))
        lines.push(`    ${item[0]}${padding} ${item[1]}`)
      }
    }

    lines.push('')
    return lines
  },
}

// --- whoami ---
COMMANDS.whoami = {
  desc: 'Display user information',
  async handler(args, term) {
    return [
      '',
      '  ── Profile ─────────────────────────────────────',
      '',
      '  Name:      Mehank Kadu',
      '  Handle:    M3hank',
      '  Role:      Security Analyst',
      '             & Secure Code Reviewer',
      '  Education: B.Tech Cyber-Security',
      '             Parul University (2020–2024)',
      '',
      '  Experience:',
      '    • Security Analyst — Forensic Cybertech',
      '      Feb 2026 – Present',
      '    • Secure Code Reviewer — Haksec (Remote)',
      '      Oct 2023 – Feb 2026',
      '    • Cyber-Security Intern — TechDefence Labs',
      '      Dec 2023 – Mar 2024',
      '',
    ]
  },
}

// --- neofetch ---
COMMANDS.neofetch = {
  desc: 'Display system info with ASCII art',
  async handler(args, term) {
    const now = new Date()
    const bootTime = term._bootTime || Date.now()
    const uptime = Math.floor((now - bootTime) / 1000)
    const uptimeStr = uptime < 60 ? `${uptime}s` : `${Math.floor(uptime / 60)}m ${uptime % 60}s`

    const theme = document.body.classList.contains('light-mode') ? 'Light' : 'Dark'

    return [
      '',
      ART_NEOFETCH,
      '',
      '  ────────────────────────────────────────────',
      '',
      `  User:     Mehank Kadu (M3hank)`,
      `  Title:    Security Analyst & Secure Code Reviewer`,
      `  Email:    m3hank1337@gmail.com`,
      `  Site:     https://m3hank.github.io`,
      `  OS:       PortfolioOS v2.0`,
      `  Shell:    m3hank-sh 1.0`,
      `  Theme:    ${theme}`,
      `  Uptime:   ${uptimeStr}`,
      `  Version:  2.0.0`,
      '',
    ]
  },
}

// --- ls ---
COMMANDS.ls = {
  desc: 'List directory contents',
  async handler(args, term) {
    let target = term.cwd
    let showAll = false
    let longFormat = false

    // Parse flags
    const cleanArgs = args.filter(a => {
      if (a.startsWith('-')) {
        if (a.includes('a')) showAll = true
        if (a.includes('l')) longFormat = true
        return false
      }
      return true
    })

    if (cleanArgs.length > 0) {
      target = resolvePath(term.cwd, cleanArgs[0])
    }

    if (!isDir(target)) {
      if (getNode(target)) {
        return [`  ${target}: Not a directory`]
      }
      return [`  ls: cannot access '${target}': No such file or directory`]
    }

    const listing = listDir(target)
    if (!listing) return [`  ls: cannot access '${target}': No such file or directory`]

    if (longFormat) {
      const lines = ['  total ' + listing.all.length]
      for (const d of listing.dirs) {
        lines.push(`  drwxr-xr-x  2 m3hank m3hank  4096  ${showAll ? d : d}`)
        if (!showAll && d.startsWith('.')) lines.pop()
      }
      for (const f of listing.files) {
        const node = getNode(target === '/' ? '/' + f : target + '/' + f)
        const size = (node?.content?.length || 0).toString().padStart(5)
        if (!showAll && f.startsWith('.')) continue
        lines.push(`  -rw-r--r--  1 m3hank m3hank  ${size}  ${f}`)
      }
      return lines
    }

    const items = []
    for (const d of listing.dirs) {
      if (!showAll && d.startsWith('.')) continue
      items.push(d + '/')
    }
    for (const f of listing.files) {
      if (!showAll && f.startsWith('.')) continue
      items.push(f)
    }

    if (items.length === 0) return ['  (empty)']
    return ['  ' + columnize(items)]
  },
}

// Column layout helper (standalone so handlers can call it)
function columnize(items) {
  const colW = Math.max(...items.map(i => i.length)) + 3
  const cols = Math.max(1, Math.floor(72 / colW))
  const rows = Math.ceil(items.length / cols)
  const result = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      const idx = r + c * rows
      if (idx < items.length) {
        row.push(items[idx].padEnd(colW))
      }
    }
    if (row.length) result.push(row.join('').trimEnd())
  }
  return result.join('\n  ')
}

// --- cd ---
COMMANDS.cd = {
  desc: 'Change current directory',
  async handler(args, term) {
    let target = '/'

    if (args.length > 0) {
      if (args[0] === '-') {
        // Go to previous directory
        target = term.prevDir
      } else if (args[0] === '~' || args[0] === '') {
        target = '/home/m3hank'
      } else {
        target = resolvePath(term.cwd, args[0])
      }
    }

    if (!isDir(target)) {
      return [`  cd: ${args[0] || ''}: No such directory`]
    }

    term.prevDir = term.cwd
    term.cwd = target
    return [] // cd produces no output on success
  },
}

// --- cat ---
COMMANDS.cat = {
  desc: 'Display file contents',
  async handler(args, term) {
    if (!args.length) return ['  Usage: cat <file> [file2 ...]']

    const results = []
    for (const arg of args) {
      const path = resolvePath(term.cwd, arg)
      const node = getNode(path)
      if (!node) {
        results.push(`  cat: ${arg}: No such file or directory`)
        continue
      }
      if (node.type === 'dir') {
        results.push(`  cat: ${arg}: Is a directory`)
        continue
      }
      const content = resolveContent(node)
      if (content) results.push(content)
    }
    return results
  },
}

// --- read ---
COMMANDS.read = {
  desc: 'Read a blog post',
  async handler(args, term) {
    if (!args.length) return ['  Usage: read <blog-slug>', '  Use "blogs" to see available posts.']

    const slug = args[0].replace(/\.md$/i, '')
    const posts = window.M3HANK?.blogPosts || []
    const post = posts.find(p => p.slug === slug)

    if (!post) {
      return [`  No blog found with slug '${slug}'.`, '  Use "blogs" to see available posts.']
    }

    try {
      const resp = await fetch('/' + post.path)
      if (!resp.ok) throw new Error('fetch failed')
      const md = await resp.text()

      // Render markdown for terminal
      const rendered = renderMarkdown(md)
      return [
        '',
        `  ════════════════════════════════════════════════════`,
        `  ${post.title}`,
        `  ${post.date}`,
        `  ════════════════════════════════════════════════════`,
        '',
        ...rendered,
        '',
      ]
    } catch (e) {
      return [`  Error: Could not load blog post '${slug}'.`]
    }
  },
}

// --- blogs ---
COMMANDS.blogs = {
  desc: 'List blog posts',
  async handler(args, term) {
    const posts = window.M3HANK?.blogPosts || []
    if (!posts.length) {
      return ['  No blog posts available yet.']
    }

    const lines = ['', '  Blog Posts:', '']
    for (const p of posts) {
      lines.push(`    📄  ${p.title}`)
      lines.push(`       Posted: ${p.date}  |  read: ${p.slug}`)
      lines.push('')
    }
    return lines
  },
}

// --- pwd ---
COMMANDS.pwd = {
  desc: 'Print working directory',
  async handler(args, term) {
    return [term.cwd || '/']
  },
}

// --- projects ---
COMMANDS.projects = {
  desc: 'List projects and tools',
  async handler(args, term) {
    const projs = window.M3HANK?.projects || []
    if (!projs.length) {
      return ['  Loading projects… Use "ls /projects" once loaded.']
    }

    const lines = ['', '  Projects & Tools:', '']
    for (const p of projs) {
      lines.push(`    🔧  ${p.name}`)
      lines.push(`       ${p.description}`)
      if (p.url) lines.push(`       ${p.url}`)
      lines.push('')
    }
    return lines
  },
}

// --- skills ---
COMMANDS.skills = {
  desc: 'Show technical skills',
  async handler(args, term) {
    const node = getNode('/skills')
    const content = resolveContent(node)
    return content ? [content] : ['  No skills data available.']
  },
}

// --- contact / social ---
COMMANDS.contact = {
  desc: 'Show contact information',
  async handler(args, term) {
    const node = getNode('/contact')
    const content = resolveContent(node)
    return content ? [content] : ['  No contact data available.']
  },
}
COMMANDS.social = {
  desc: 'Show social media links',
  async handler(args, term) {
    const node = getNode('/social')
    const content = resolveContent(node)
    return content ? [content] : ['  No social data available.']
  },
}

// --- clear ---
COMMANDS.clear = {
  desc: 'Clear the terminal',
  async handler(args, term) {
    term.clearOutput()
    return []
  },
}

// --- banner ---
COMMANDS.banner = {
  desc: 'Display the ASCII art header',
  async handler(args, term) {
    return ['', ART_BANNER, '']
  },
}

// --- echo ---
COMMANDS.echo = {
  desc: 'Print a message',
  async handler(args, term) {
    return [args.join(' ') || '']
  },
}

// --- date ---
COMMANDS.date = {
  desc: 'Display current date and time',
  async handler(args, term) {
    return ['  ' + new Date().toString()]
  },
}

// --- uptime ---
COMMANDS.uptime = {
  desc: 'Show session uptime',
  async handler(args, term) {
    const now = Date.now()
    const bootTime = term._bootTime || (term._bootTime = now)
    const diff = Math.floor((now - bootTime) / 1000)
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60

    const parts = []
    if (h > 0) parts.push(`${h}h`)
    if (m > 0) parts.push(`${m}m`)
    parts.push(`${s}s`)

    return [`  up ${parts.join(', ')}`]
  },
}

// --- history ---
COMMANDS.history = {
  desc: 'Show command history',
  async handler(args, term) {
    if (!term.commandHistory.length) return ['  No commands in history.']
    return term.commandHistory.map((c, i) => `  ${i + 1}  ${c}`)
  },
}

// --- theme ---
COMMANDS.theme = {
  desc: 'Toggle light/dark mode',
  async handler(args, term) {
    const cb = document.getElementById('theme-checkbox')
    if (cb) {
      cb.checked = !cb.checked
      cb.dispatchEvent(new Event('change'))
    }
    const mode = document.body.classList.contains('light-mode') ? 'light' : 'dark'
    return [`  Switched to ${mode} mode.`]
  },
}

// --- gui / exit ---
COMMANDS.gui = {
  desc: 'Switch to GUI mode',
  async handler(args, term) {
    if (window.M3HANK?.switchMode) {
      window.M3HANK.switchMode('gui')
    }
    return []
  },
}
COMMANDS.exit = {
  desc: 'Exit terminal and return to GUI',
  async handler(args, term) {
    if (window.M3HANK?.switchMode) {
      window.M3HANK.switchMode('gui')
    }
    return []
  },
}

// --- sudo (easter egg) ---
COMMANDS.sudo = {
  desc: 'Execute a command as root',
  async handler(args, term) {
    let ip = null
    try {
      const resp = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
      if (resp.ok) {
        const data = await resp.json()
        ip = data.ip
      }
    } catch {}

    const ipLine = ip ? `  Your IP: ${ip}` : '  I can see you.'
    const threatLine = ip ? '  I know where you live.' : ''

    if (args.length === 0) {
      return [
        '  ────────────────────────────────────────────────',
        '',
        `  🕵  ${ipLine}`,
        ...(threatLine ? [`  ⚡  ${threatLine}`] : []),
        '  ⚡  Permission denied.',
        '',
        '  Let me stop you right there — you\'re not root.',
        '  ────────────────────────────────────────────────',
      ]
    }

    return [
      '  ────────────────────────────────────────────────',
      '',
      `  🕵  ${ipLine}`,
      ...(threatLine ? [`  ⚡  ${threatLine}`] : []),
      '  ⚡  Permission denied.',
      '  ⚡  This incident will be reported.',
      '',
      '  Nice try, but you\'re not root here.',
      '  ────────────────────────────────────────────────',
      '',
      `  (But for what it's worth, "${args.join(' ')}" sounds cool.)`,
    ]
  },
}

// --- su (easter egg) ---
COMMANDS.su = {
  desc: 'Switch user',
  async handler(args, term) {
    const user = args[0] || 'root'
    return [
      `  Password: `,
      '',
      '  su: Authentication failure',
      '  Sorry.',
      '',
      `  (You really thought you could just \`su ${user}\` without a password?)`,
    ]
  },
}

// --- ssh (easter egg) ---
COMMANDS.ssh = {
  desc: 'SSH to a remote host',
  async handler(args, term) {
    if (!args.length) return ['  usage: ssh user@hostname']
    const target = args.pop()
    return [
      `  ssh: Could not resolve hostname '${target}': Name or service not known`,
      '',
      '  ── You are here ──────────────────────────────',
      '  This is a portfolio terminal. There is no SSH.',
      '  The real SSH is outside. Go touch it.',
      '  ──────────────────────────────────────────────',
    ]
  },
}

// --- nmap (easter egg) ---
COMMANDS.nmap = {
  desc: 'Port scanning utility',
  async handler(args, term) {
    const target = args.filter(a => !a.startsWith('-')).join(' ') || 'localhost'
    const flags = args.filter(a => a.startsWith('-')).join(' ') || '-sV'

    return [
      '  Starting Nmap 7.94 ( https://nmap.org )',
      `  Scanning ${target}...`,
      '  ⠋',
    ]
  },
}

// --- decode (hidden command — not in help) ---
COMMANDS.decode = {
  desc: 'Decode hexadecimal, base64, or rot13 strings',
  async handler(args, term) {
    if (!args.length) return ['  Usage: decode <hex|base64|rot13> <string>', '  Usage: decode hex <hex-string>', '  Usage: decode base64 <base64-string>', '  Usage: decode rot13 <text>']

    const mode = args[0].toLowerCase()
    const input = args.slice(1).join(' ')
    if (!input) return ['  Error: Nothing to decode.']

    switch (mode) {
      case 'hex': {
        const cleaned = input.replace(/\s+/g, '')
        if (!/^[0-9a-fA-F]+$/.test(cleaned)) return ['  Error: Invalid hex string.']
        let decoded = ''
        for (let i = 0; i < cleaned.length; i += 2) {
          decoded += String.fromCharCode(parseInt(cleaned.substr(i, 2), 16))
        }
        return ['', `  Decoded: ${decoded}`, '']
      }
      case 'base64': {
        try {
          const decoded = atob(input)
          return ['', `  Decoded: ${decoded}`, '']
        } catch {
          return ['  Error: Invalid base64 string.']
        }
      }
      case 'rot13': {
        const decoded = input.replace(/[a-zA-Z]/g, c => {
          const code = c.charCodeAt(0)
          if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + 13) % 26) + 65)
          if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 13) % 26) + 97)
          return c
        })
        return ['', `  Decoded: ${decoded}`, '']
      }
      default:
        return ['  Error: Unknown encoding. Use "hex", "base64", or "rot13".']
    }
  },
}

// --- matrix (easter egg) ---
COMMANDS.matrix = {
  desc: 'The Matrix has you…',
  async handler(args, term) {
    if (term.matrixActive) {
      term.matrixRain?.stop()
      term.matrixRain = null
      term.matrixActive = false
      return ['  Matrix deactivated.']
    }

    term.matrixActive = true
    matrixRain(term)
    return ['', '  Wake up, Neo…', '  (type "matrix" or press Escape to exit)', '']
  },
}

// ──────────────────────────────────────────────
// MATRIX RAIN EASTER EGG
// ──────────────────────────────────────────────

function matrixRain(term) {
  const container = term.el

  // Create canvas overlay — pointer-events:none so input/scroll still works
  const canvas = document.createElement('canvas')
  canvas.id = 'matrix-canvas'
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;'
  container.style.position = 'relative'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')

  function resize() {
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
  }
  resize()
  window.addEventListener('resize', resize)

  const fontSize = 16
  const columns = Math.floor(canvas.width / fontSize)
  const drops = Array(columns).fill(1)
  // Randomize initial positions so they don't all start at the top
  for (let i = 0; i < drops.length; i++) {
    drops[i] = Math.floor(Math.random() * -20)
  }

  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'

  let animId = null
  let running = true

  function draw() {
    if (!running) return

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#4ade80'
    ctx.font = fontSize + 'px VT323, monospace'

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)]
      ctx.fillText(text, i * fontSize, drops[i] * fontSize)

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0
      }
      drops[i]++
    }

    animId = requestAnimationFrame(draw)
  }

  draw()

  // Stop on Escape key
  function onEscape(e) {
    if (e.key === 'Escape') {
      stop()
    }
  }
  document.addEventListener('keydown', onEscape)

  function stop() {
    if (!running) return
    running = false
    if (animId) cancelAnimationFrame(animId)
    canvas.remove()
    window.removeEventListener('resize', resize)
    document.removeEventListener('keydown', onEscape)
    term.matrixActive = false
    term.focus()
  }

  term.matrixRain = { stop }
}

// ──────────────────────────────────────────────
// MARKDOWN RENDERER (for terminal display)
// ──────────────────────────────────────────────

function renderMarkdown(md) {
  const lines = md.split('\n')
  const result = []
  let inCodeBlock = false
  let inList = false

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '')

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        result.push('  └' + '─'.repeat(50) + '┘')
        result.push('')
        inCodeBlock = false
      } else {
        result.push('')
        result.push('  ┌' + '─'.repeat(50) + '┐')
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) {
      result.push('  │ ' + line)
      continue
    }

    // Headings
    if (line.startsWith('### ')) {
      result.push('  ── ' + line.slice(4) + ' ──')
      continue
    }
    if (line.startsWith('## ')) {
      result.push('')
      result.push('  ── ' + line.slice(3) + ' ──')
      result.push('')
      continue
    }
    if (line.startsWith('# ')) {
      result.push('')
      result.push('  ' + line.slice(2))
      result.push('')
      continue
    }

    // List items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      result.push('    • ' + line.slice(2))
      inList = true
      continue
    }
    if (line.match(/^\d+\.\s/)) {
      result.push('    ' + line)
      inList = true
      continue
    }
    if (inList && line.trim() === '') {
      result.push('')
      inList = false
      continue
    }

    // Horizontal rules
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      result.push('  ' + '─'.repeat(50))
      continue
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      result.push('  │ ' + line.slice(2))
      continue
    }

    // Empty lines
    if (line.trim() === '') {
      result.push('')
      continue
    }

    // Regular paragraph — strip inline formatting (**bold**, `code`, [links](url))
    let clean = line
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
    result.push('  ' + clean)
  }

  return result
}

// ──────────────────────────────────────────────
// BOOTSTRAP
// ──────────────────────────────────────────────

/**
 * Initialize the terminal engine on the given container element.
 * Called by the app (script.js) when switching to terminal mode.
 */
function initTerminal(containerEl) {
  if (!containerEl) {
    containerEl = document.getElementById('terminal-mode')
  }
  if (!containerEl) return null

  // Prevent double-init
  if (containerEl._terminal) {
    const existing = containerEl._terminal
    existing.renderAll()
    existing.focus()
    return existing
  }

  const engine = new TerminalEngine(containerEl)
  containerEl._terminal = engine
  engine.init()
  return engine
}

// Expose for debugging
window.TerminalEngine = TerminalEngine

// ──────────────────────────────────────────────
// STEALTH CONSOLE HINT
// ──────────────────────────────────────────────
;(() => {
  const orig = console.info.bind(console)
  console.info = function() { orig.apply(console, arguments) }
})()
setTimeout(() => {
  console.info('%c🔍 %cNice. You found the console.', 'font-size:20px', 'font-size:14px')
  console.info('%cNot everything is in the help menu. Not everything looks like what it seems.', 'font-style:italic;color:#4ade80')
}, 500)
