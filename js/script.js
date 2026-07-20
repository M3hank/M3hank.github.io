// ─── M3HANK PORTFOLIO — APP CONTROLLER ───
// Manages GUI mode, terminal mode switching, and shared state.

// ─── SHARED STATE (MUST be initialized first, before anything that can throw) ───
window.M3HANK = window.M3HANK || {
  blogPosts: [
    { title: "How I Caused a Denial of Service by Poisoning the Cache", date: "08 Aug 2025", path: "blogs/blog1.md", slug: "Cache-Poisoning-Dos" },
  ],
  projects: [],
  currentMode: 'gui', // 'gui' | 'terminal'
  terminalInitialized: false,
}

// Safe showdown converter (with fallback if CDN fails)
const markdownConverter = (typeof showdown !== 'undefined')
  ? new showdown.Converter()
  : { makeHtml: (md) => `<pre>${md}</pre>` }

// Alias for convenience
const blogPosts = window.M3HANK.blogPosts;

// --- VIEWS / RENDER FUNCTIONS ---

/**
 * Renders a list of projects into the DOM.
 * @param {Array<Object>} projects - An array of project objects.
 */
function renderProjects(projects) {
    const toolsList = document.getElementById('tools-list');
    if (!toolsList) return;
    toolsList.innerHTML = '';
    if (!projects || projects.length === 0) {
        toolsList.innerHTML = '<p class="text-gray-400">No projects found.</p>';
        return;
    }
    projects.forEach(project => {
        const projectEl = document.createElement('div');
        projectEl.className = 'flex flex-col sm:flex-row sm:space-x-8 content-child';
        projectEl.innerHTML = `
            <p class="text-gray-300 w-full sm:w-40">
                <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="tool-link hover:underline">${project.name}</a>
            </p>
            <p class="flex-1">${project.description}</p>
        `;
        toolsList.appendChild(projectEl);
    });
    revealContent(toolsList.parentElement);
}

/**
 * Renders the list of blog posts.
 */
function renderBlogsList() {
    const blogsList = document.getElementById('blogs-list');
    const blogViewer = document.getElementById('blog-viewer');
    if (!blogsList || !blogViewer) return;

    blogsList.innerHTML = '';
    blogViewer.classList.add('hidden');
    blogsList.classList.remove('hidden');

    blogPosts.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = 'content-child';
        postEl.innerHTML = `<a href="/blogs/${post.slug}" class="blog-link hover:underline cursor-pointer">${post.title}</a><p class="text-sm text-gray-400">${post.date}</p>`;
        blogsList.appendChild(postEl);
    });
    revealContent(blogsList.parentElement);
}

/**
 * Renders a single blog post.
 * @param {string} html - The HTML content of the blog post.
 */
function renderBlogPost(html) {
    const blogsList = document.getElementById('blogs-list');
    const blogViewer = document.getElementById('blog-viewer');
    const blogContent = document.getElementById('blog-content');
    if (!blogsList || !blogViewer || !blogContent) return;

    blogsList.classList.add('hidden');
    blogViewer.classList.remove('hidden');
    blogContent.innerHTML = html;
}

/**
 * Switches the main view between the main content and the about section.
 * @param {string} view - The view to show ('main' or 'about').
 */
function switchMainView(view) {
    const mainContent = document.getElementById('main-content');
    const aboutSection = document.getElementById('about-section');
    if (!mainContent || !aboutSection) return;

    if (view === 'about') {
        mainContent.classList.add('hidden');
        aboutSection.classList.remove('hidden');
        revealContent(aboutSection);
    } else { // 'main' view
        mainContent.classList.remove('hidden');
        aboutSection.classList.add('hidden');
        revealContent(mainContent);
    }
    updateNavLinks(view === 'about' ? '/about' : '/');
}

/**
 * Updates the active state of the main navigation links.
 * @param {string} path - The current URL path.
 */
function updateNavLinks(path) {
    const mainNav = document.getElementById('main-nav');
    if (!mainNav) return;
    mainNav.querySelectorAll('a').forEach(link => {
        link.classList.add('inactive');
        link.classList.remove('active');
    });
    const targetSelector = path === '/about' ? 'a[href="/about"]' : 'a[href="/"]';
    const activeLink = mainNav.querySelector(targetSelector);
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.classList.remove('inactive');
    }
}

// --- DATA FETCHING ---

async function fetchProjects() {
    try {
        const response = await fetch('/projects.json');
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch projects.json. Please ensure the file exists and is accessible.", error);
        return []; // Return an empty array on failure
    }
}

async function fetchBlogPost(path) {
    try {
        const response = await fetch(`/${path}`);
        if (!response.ok) throw new Error('Network response was not ok.');
        const markdown = await response.text();
        return markdownConverter.makeHtml(markdown);
    } catch (error) {
        console.error(`Could not fetch ${path}, returning mock content.`, error);
        return markdownConverter.makeHtml(`## Blog Post Not Found\n\nThis is placeholder content because the file at \`${path}\` could not be loaded.`);
    }
}

// --- ROUTER & NAVIGATION LOGIC ---

/**
 * The main router. Reads the URL and decides which content to display.
 */
async function router() {
    // THIS IS THE CRITICAL FIX: Check for a redirect from the 404 page
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('path');
    
    if (redirectPath) {
        const params = decodeURIComponent(urlParams.get('params') || '');
        const hash = window.location.hash;
        // Reconstruct the original URL and replace the current history state
        history.replaceState({}, '', `/${redirectPath}${params}${hash}`);
    }

    const path = window.location.pathname;

    if (path === '/about') {
        switchMainView('about');
    } else if (path.startsWith('/blogs/')) {
        switchMainView('main'); // Ensure the main content area is visible
        const slug = path.split('/')[2];
        const post = blogPosts.find(p => p.slug === slug);
        const postHtml = post ? await fetchBlogPost(post.path) : '<h2>404 - Post Not Found</h2>';
        renderBlogPost(postHtml);
    } else { // Root path '/'
        switchMainView('main');
        renderBlogsList();
    }
}


/**
 * Handles navigation clicks to prevent page reloads and update history.
 * @param {Event} e - The click event.
 */
function handleLinkClick(e) {
    const link = e.target.closest('a');
    if (link && link.href && link.host === window.location.host && link.target !== '_blank') {
        e.preventDefault();
        history.pushState({}, '', link.href);
        router();
    }
}

/**
 * Switches between GUI and Terminal modes.
 * @param {'gui'|'terminal'} mode - The mode to switch to.
 */
function switchMode(mode) {
  if (mode === window.M3HANK.currentMode) return;
  window.M3HANK.currentMode = mode;

  const gui = document.getElementById('gui-mode');
  const term = document.getElementById('terminal-mode');

  if (!gui || !term) return;

  if (mode === 'terminal') {
    // Show terminal, hide GUI
    gui.classList.add('hidden');
    term.classList.remove('hidden');
    document.body.classList.remove('gui-mode');
    document.body.classList.add('term-mode');

    // Initialize terminal engine on first launch
    if (!window.M3HANK.terminalInitialized) {
      window.M3HANK.terminalInitialized = true;
      // Small delay so the DOM is fully ready
      setTimeout(() => initTerminal(term), 100);
    } else {
      // Resume existing terminal session
      const engine = term._terminal;
      if (engine) {
        engine.renderAll();
        engine.focus();
      }
    }

    // Sync terminal theme (it reads body class)
  } else {
    // Show GUI, hide terminal
    term.classList.add('hidden');
    gui.classList.remove('hidden');
    document.body.classList.remove('term-mode');
    document.body.classList.add('gui-mode');
  }

  // Sync the scroll position after mode switch
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event('resize'));
}

// Expose for terminal commands (gui/exit)
window.M3HANK.switchMode = switchMode;

// ─── CHEAT DETECTION (just for fun) ───
// Flags are base64-encoded so `grep CTF{` in the source finds nothing
let _cheatDetected = false
function _cheat(msg) {
  if (_cheatDetected) return
  _cheatDetected = true
  console.warn('%c⚠️  CHEAT DETECTED', 'color:#ef4444;font-size:16px;font-weight:bold')
  console.warn('%c' + msg, 'font-style:italic;color:#a3a3a3')
  const el = document.getElementById('ctf-progress')
  if (el && !el.dataset.cheated) {
    el.dataset.cheated = '1'
    el.textContent += '  👀 Nice try, cheater.'
  }
}

// Trap: detect console access to flag patterns
;(() => {
  const orig = console.log
  console.log = function() {
    const text = Array.from(arguments).map(a => ''+a).join(' ')
    if ((text.includes('CTF') || text.includes('_b64')) && new Error().stack?.includes('console')) {
      _cheat('Reading flags from the console, are we?')
    }
    return orig.apply(console, arguments)
  }
})()

// ─── CTF CHALLENGE DATA (obfuscated - no plain CTF{ strings anywhere) ───
const _k = [0x4d, 0x33, 0x68, 0x61, 0x6e, 0x6b, 0x32, 0x30, 0x32, 0x36, 0x43, 0x54, 0x46, 0x7b, 0x7d, 0x5f]
function _p(a) {
  let s = ''
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i] ^ _k[i % 16] ^ (i * 7 + 3))
  return s
}

const CTF_FLAGS = [
  { id: 1, name: 'Flag 1', flag: _p([13, 109, 63, 2, 5, 37, 44, 91, 97, 1, 100, 112, 34, 87, 71, 81, 13, 42, 217, 132, 210, 142, 240, 224, 241, 183, 165, 252, 244, 219, 220, 176, 202, 164]) },
  { id: 2, name: 'Flag 2', flag: _p([13, 109, 63, 2, 8, 125, 106, 91, 111, 68, 127, 106, 117, 122, 108, 91, 13, 22, 154, 217, 148, 143, 204, 167, 198, 231, 202, 240, 178, 234, 206, 239, 154, 190, 228]) },
  { id: 3, name: 'Flag 3', flag: _p([13, 109, 63, 2, 5, 37, 44, 91, 106, 7, 121, 91, 32, 86, 71, 7, 82, 58, 217, 182, 150, 205, 221, 224, 241, 219, 153, 252, 178, 214, 195, 178, 192, 190, 228]) },
  { id: 4, name: 'Flag 4', flag: _p([13, 109, 63, 2, 23, 125, 109, 55, 103, 7, 59, 103, 98, 122, 41, 64, 97, 125, 133, 133, 190, 201, 205, 164, 236, 240, 165, 240, 178, 193, 156, 178, 194, 170, 228]) },
]

const solvedFlags = new Set()

function renderCTF() {
  const list = document.getElementById('ctf-list')
  const progress = document.getElementById('ctf-progress')
  if (!list) return

  list.innerHTML = ''
  progress.textContent = `Found: ${solvedFlags.size} / ${CTF_FLAGS.length} flags`

  CTF_FLAGS.forEach(c => {
    const solved = solvedFlags.has(c.id)
    const card = document.createElement('div')
    card.className = `ctf-card ${solved ? 'solved' : ''}`
    card.innerHTML = `
      <div class="ctf-card-header">
        <span class="ctf-status">${solved ? '[✓]' : '[ ]'}</span>
        <span class="ctf-name">${c.name}</span>
      </div>
      <div class="ctf-submit-row">
        <input type="text" class="ctf-input" placeholder="${solved ? 'Already solved!' : 'Enter flag...'}" ${solved ? 'disabled' : ''} />
        <button class="ctf-btn" ${solved ? 'disabled' : ''}>Submit</button>
        <span class="ctf-feedback"></span>
      </div>
    `
    list.appendChild(card)

    const input = card.querySelector('.ctf-input')
    const btn = card.querySelector('.ctf-btn')
    const feedback = card.querySelector('.ctf-feedback')

    const checkFlag = () => {
      const val = input.value.trim()
      if (val.toLowerCase() === c.flag.toLowerCase()) {
        solvedFlags.add(c.id)
        feedback.textContent = '✅ Correct!'
        feedback.className = 'ctf-feedback success'
        setTimeout(() => renderCTF(), 800)
        localStorage.setItem('ctf-solved', JSON.stringify([...solvedFlags]))
      } else {
        feedback.textContent = '❌ Wrong flag'
        feedback.className = 'ctf-feedback error'
        setTimeout(() => { feedback.textContent = ''; feedback.className = 'ctf-feedback' }, 2000)
      }
    }

    btn.addEventListener('click', checkFlag)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkFlag() })
  })
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Listen for all navigation clicks on the document body
    document.body.addEventListener('click', handleLinkClick);
    
    // Listen for browser back/forward button clicks
    window.addEventListener('popstate', router);

    // Simple tab switcher for Blogs/Tools/CTF
    const contentTabs = document.getElementById('content-tabs');
    if (contentTabs) {
        contentTabs.addEventListener('click', (e) => {
            if (e.target.matches('h2')) {
                const blogsTab = document.getElementById('blogs-section');
                const toolsTab = document.getElementById('tools-section');
                const ctfTab = document.getElementById('ctf-section');
                const blogsBtn = contentTabs.querySelector('[data-text="[ Blogs ]"]');
                const toolsBtn = contentTabs.querySelector('[data-text="[ Tools ]"]');
                const ctfBtn = contentTabs.querySelector('[data-text="[ CTF ]"]');

                [blogsTab, toolsTab, ctfTab].forEach(t => t?.classList.add('hidden'));
                [blogsBtn, toolsBtn, ctfBtn].forEach(b => { b?.classList.add('inactive'); b?.classList.remove('active') });

                if (e.target === ctfBtn) {
                    ctfTab.classList.remove('hidden');
                    ctfBtn.classList.add('active');
                    ctfBtn.classList.remove('inactive');
                    renderCTF();
                    revealContent(ctfTab);
                } else if (e.target === toolsBtn) {
                    toolsTab.classList.remove('hidden');
                    toolsBtn.classList.add('active');
                    toolsBtn.classList.remove('inactive');
                    revealContent(toolsTab);
                } else {
                    blogsTab.classList.remove('hidden');
                    blogsBtn.classList.add('active');
                    blogsBtn.classList.remove('inactive');
                    renderBlogsList();
                }
            }
        });
    }

    const backToBlogsButton = document.getElementById('back-to-blogs');
    if (backToBlogsButton) {
        backToBlogsButton.addEventListener('click', (e) => {
            e.preventDefault();
            history.pushState({}, '', '/');
            router();
        });
    }

    // Theme Switch Logic
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (themeCheckbox) {
        const savedTheme = localStorage.getItem('theme');
        // Default to LIGHT unless 'dark' is explicitly saved
        if (savedTheme === 'dark') {
            document.body.classList.remove('light-mode');
            themeCheckbox.checked = false;
        } else {
            document.body.classList.add('light-mode');
            themeCheckbox.checked = true;
        }

        themeCheckbox.addEventListener('change', () => {
            if (themeCheckbox.checked) {
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // ── Restore CTF progress ──
    try {
      const saved = JSON.parse(localStorage.getItem('ctf-solved') || '[]')
      saved.forEach(id => solvedFlags.add(id))
    } catch {}

    // ── Initial page load ──
    router();
    fetchProjects().then(projects => {
      window.M3HANK.projects = projects;
      renderProjects(projects);
    });

    // ── Launch Terminal button (in GUI nav) ──
    const launchBtn = document.getElementById('launch-terminal-btn');
    if (launchBtn) {
      launchBtn.addEventListener('click', () => switchMode('terminal'));
    }

    // ── Return to GUI button (in terminal header) ──
    const returnBtn = document.getElementById('term-gui-btn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => switchMode('gui'));
    }
});

// --- HELPER FUNCTIONS (UNCHANGED) ---
function revealContent(sectionElement) { if (!sectionElement) return; const children = sectionElement.querySelectorAll('.content-child'); children.forEach(child => { child.style.visibility = 'hidden'; }); let delay = 100; children.forEach((child, index) => { setTimeout(() => { child.style.visibility = 'visible'; }, delay * (index + 1)); }); }
