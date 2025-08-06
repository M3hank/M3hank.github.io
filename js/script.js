// --- DYNAMIC CONTENT & ROUTING SCRIPT (FIXED) ---

const markdownConverter = new showdown.Converter();

// --- CONFIG ---
const blogPosts = [
    { title: "How I Caused a Denial of Service by Poisoning the Cache", date: "08 Aug 2025", path: "blogs/blog1.md", slug: "Cache-Poisoning-Dos" },
];

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

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // Listen for all navigation clicks on the document body
    document.body.addEventListener('click', handleLinkClick);
    
    // Listen for browser back/forward button clicks
    window.addEventListener('popstate', router);

    // Simple tab switcher for Blogs/Tools
    const contentTabs = document.getElementById('content-tabs');
    if (contentTabs) {
        contentTabs.addEventListener('click', (e) => {
            if (e.target.matches('h2')) {
                const blogsTab = document.getElementById('blogs-section');
                const toolsTab = document.getElementById('tools-section');
                const blogsBtn = contentTabs.querySelector('[data-text="[ Blogs ]"]');
                const toolsBtn = contentTabs.querySelector('[data-text="[ Tools ]"]');

                if (e.target === toolsBtn) {
                    blogsTab.classList.add('hidden');
                    toolsTab.classList.remove('hidden');
                    toolsBtn.classList.add('active');
                    toolsBtn.classList.remove('inactive');
                    blogsBtn.classList.add('inactive');
                    blogsBtn.classList.remove('active');
                    revealContent(toolsTab);
                } else {
                    toolsTab.classList.add('hidden');
                    blogsTab.classList.remove('hidden');
                    blogsBtn.classList.add('active');
                    blogsBtn.classList.remove('inactive');
                    toolsBtn.classList.add('inactive');
                    toolsBtn.classList.remove('active');
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

    // Initial page load
    router();
    fetchProjects().then(renderProjects);
});

// --- HELPER FUNCTIONS (UNCHANGED) ---
function revealContent(sectionElement) { if (!sectionElement) return; const children = sectionElement.querySelectorAll('.content-child'); children.forEach(child => { child.style.visibility = 'hidden'; }); let delay = 100; children.forEach((child, index) => { setTimeout(() => { child.style.visibility = 'visible'; }, delay * (index + 1)); }); }
