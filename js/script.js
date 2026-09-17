const PROJECT_DATA = {
  'nexus-auth': {
    badge: 'FastAPI · Vanilla JS · Solo Project',
    year: 'Featured Project',
    title: 'Nexus — Auth Portal',
    summary: 'Full-stack authentication portal featuring a FastAPI backend and vanilla HTML/CSS/JS frontend served directly via Uvicorn static files with secure cookie-based JWTs.',
    architecture: `[Client Web Browser (HTML/CSS/JS)]
                     │
             (HTTPS / Cookie Credentials)
                     ▼
          [Uvicorn Static & API Server]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 [joserfc JWT Engine]   [Argon2 / Passlib Hashing]
 (HttpOnly & SameSite)  (Pydantic v2 Validations)
         │                       │
         └───────────┬───────────┘
                     ▼
       [SQLAlchemy ORM + SQLite DB]`,
    decisions: [
      'Built a full-stack authentication portal with FastAPI backend and plain HTML/CSS/JS frontend, served directly via Uvicorn as static files.',
      'Implemented secure cookie-based JWT authentication using joserfc with HttpOnly, SameSite=Lax, configurable expiry, and production Secure flag.',
      'Used Argon2 via Passlib for password hashing and Pydantic v2 for API-level validation including mobile number, EmailStr, and password rules.',
      'Added password strength meter, authentication tabs, toast notifications, real-time session countdown, and warning/critical states.',
      'Configured CORS for same-origin and Live Server development with credentials support for cookie passthrough.'
    ],
    tech: ['FastAPI', 'joserfc JWT', 'SQLAlchemy', 'SQLite', 'Argon2', 'Passlib', 'Pydantic v2', 'Cookie Auth'],
    github: 'https://github.com/Vinay-1774'
  },

  'terminal-chat': {
    badge: 'FastAPI · asyncio · Solo Project',
    year: 'Featured Project',
    title: 'Private Chat App — Terminal WebSocket DM System',
    summary: 'Terminal-based private DM application enabling concurrent user connections via WebSockets to select online peers and exchange real-time messages in isolated rooms.',
    architecture: `[Terminal / WebSocket Clients] ── (WS Handshake) ──> [FastAPI WebSocket Endpoint]
                                                                  │
                                                        [ConnectionManager]
                                                   ┌──────────────┴──────────────┐
                                                   ▼                             ▼
                                        [User Registry / Lobby]       [Isolated Room Registry]
                                                   │                             │
                                                   └──────────────┬──────────────┘
                                                                  ▼
                                                      [Deterministic Symmetric Room ID]
                                                      (Sorted User Pair Hashing)
                                                                  │
                                                                  ▼
                                                   [asyncio.wait(FIRST_COMPLETED)]
                                                   (Concurrent Send/Recv Coroutines)
                                                                  │
                                                                  ▼
                                            [Redis + async SQLAlchemy + SQLite (aiosqlite)]`,
    decisions: [
      'Built a terminal-based private DM application where users connect via WebSocket, select an online peer, and exchange messages in isolated rooms.',
      'Designed a ConnectionManager with separate user, lobby, and room registries for clean room isolation without cross-talk.',
      'Implemented deterministic symmetric room IDs using sorted user pairs, preventing duplicate rooms for the same users.',
      'Used asyncio.wait(FIRST_COMPLETED) to concurrently handle receive/send coroutines and cleanly cancel the remaining task on disconnect.',
      'Added lobby-wide online-user broadcasts, duplicate username detection, and /leave and /quit commands for session management.',
      'Configured Redis, database, and server URLs through pydantic-settings and environment variables without code changes.'
    ],
    tech: ['FastAPI', 'WebSockets', 'async SQLAlchemy', 'Redis', 'SQLite (aiosqlite)', 'pydantic-settings', 'asyncio'],
    github: 'https://github.com/Vinay-1774'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeaderScroll();
  initMobileNav();
  initProjectFilters();
  initProjectModal();
  initResumeModal();
  initCopyEmail();
  initContactForm();
  setCurrentYear();
});

function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const saved = localStorage.getItem('vpr-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let current = saved || (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', current);
  toggle?.addEventListener('click', () => {
    current = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', current);
    localStorage.setItem('vpr-theme', current);
  });
}

function initHeaderScroll() {
  const header = document.getElementById('header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 20 ? 'var(--shadow-sm)' : 'none';
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 100 && window.scrollY < sec.offsetTop - 100 + sec.offsetHeight) {
        current = sec.id;
      }
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  });
}

function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => menu.classList.toggle('open'));
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}

function initProjectFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');

      cards.forEach(card => {
        const show = filter === 'all' || card.getAttribute('data-category') === filter;
        card.style.display = show ? 'flex' : 'none';
        card.style.opacity = show ? '1' : '0';
      });
    });
  });
}

function initProjectModal() {
  const backdrop = document.getElementById('project-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  document.querySelectorAll('.project-card').forEach(card => {
    const openBtn = card.querySelector('.open-modal-btn');
    const id = card.getAttribute('data-project');
    openBtn?.addEventListener('click', () => {
      const data = PROJECT_DATA[id];
      if (data) {
        renderProjectModalContent(data);
        openModal(backdrop);
      }
    });
  });

  closeBtn?.addEventListener('click', () => closeModal(backdrop));
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal(backdrop);
  });
}

function renderProjectModalContent(data) {
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = `
    <div class="modal-arch-badge">${data.badge} &bull; ${data.year}</div>
    <h3 class="modal-heading">${data.title}</h3>
    <p class="project-summary">${data.summary}</p>
    
    <div class="modal-section">
      <h4>System &amp; Data Flow Architecture</h4>
      <div class="arch-box">${escapeHtml(data.architecture)}</div>
    </div>

    <div class="modal-section">
      <h4>Authenticated Features &amp; Implementation Details</h4>
      <ul class="focus-list">
        ${data.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>

    <div class="modal-section">
      <h4>Technologies &amp; Libraries</h4>
      <div class="project-tags">
        ${data.tech.map(t => `<span>${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>

    <div class="modal-section" style="margin-top: 2rem;">
      <a href="${data.github}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
        View Repository on GitHub
      </a>
    </div>
  `;
}

function initResumeModal() {
  const modal = document.getElementById('resume-modal');
  const triggers = [
    document.getElementById('open-resume-btn'),
    document.getElementById('hero-resume-btn')
  ].filter(Boolean);

  triggers.forEach(btn => btn.addEventListener('click', () => openModal(modal)));
  document.getElementById('resume-close-btn')?.addEventListener('click', () => closeModal(modal));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
  document.getElementById('download-resume-file')?.addEventListener('click', () => window.print());
}

function openModal(el) {
  el?.classList.add('open');
  el?.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(el) {
  el?.classList.remove('open');
  el?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initCopyEmail() {
  const copyBtn = document.getElementById('copy-email-btn');
  const email = 'vinaypratap4017@gmail.com';

  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(email)
      .then(() => showToast('Copied email to clipboard!'))
      .catch(() => showToast(`Email: ${email}`));
  });
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    btn.disabled = true;
    btn.innerHTML = 'Sending email...';

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Thank you, ${name}! Your email has been sent.`);
        form.reset();
      } else {
        throw new Error(data.error || 'Server error sending email');
      }
    } catch (err) {
      console.warn('Resend backend error, using email client fallback:', err);
      showToast('Redirecting to email client...');
      window.location.href = `mailto:vinaypratap4017@gmail.com?subject=${encodeURIComponent('[Portfolio Contact] ' + subject)}&body=${encodeURIComponent(message)}`;
      form.reset();
    } finally {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  });
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function setCurrentYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
