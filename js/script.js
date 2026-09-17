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
  const themeToggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('vpr-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);

  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('vpr-theme', currentTheme);
  });
}

function initHeaderScroll() {
  const header = document.getElementById('header');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.style.boxShadow = 'var(--shadow-sm)';
    } else {
      header.style.boxShadow = 'none';
    }

    let currentSection = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  });
}

function initMobileNav() {
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!navToggle || !navMenu) return;

  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
    });
  });
}

function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterValue === 'all' || category === filterValue) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(10px)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 200);
        }
      });
    });
  });
}

function initProjectModal() {
  const modalBackdrop = document.getElementById('project-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  const projectCards = document.querySelectorAll('.project-card');

  projectCards.forEach(card => {
    const openBtn = card.querySelector('.open-modal-btn');
    const projectId = card.getAttribute('data-project');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const data = PROJECT_DATA[projectId];
        if (data) {
          renderProjectModalContent(data);
          openModal(modalBackdrop);
        }
      });
    }
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => closeModal(modalBackdrop));
  }

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal(modalBackdrop);
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
  const resumeModal = document.getElementById('resume-modal');
  const openResumeNavBtn = document.getElementById('open-resume-btn');
  const heroResumeBtn = document.getElementById('hero-resume-btn');
  const resumeCloseBtn = document.getElementById('resume-close-btn');
  const downloadBtn = document.getElementById('download-resume-file');

  const triggers = [openResumeNavBtn, heroResumeBtn].filter(Boolean);

  triggers.forEach(btn => {
    btn.addEventListener('click', () => openModal(resumeModal));
  });

  if (resumeCloseBtn) {
    resumeCloseBtn.addEventListener('click', () => closeModal(resumeModal));
  }

  resumeModal.addEventListener('click', (e) => {
    if (e.target === resumeModal) closeModal(resumeModal);
  });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

function openModal(modalEl) {
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  modalEl.classList.remove('open');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initCopyEmail() {
  const copyBtn = document.getElementById('copy-email-btn');
  const email = 'vinaypratap4017@gmail.com';

  if (!copyBtn) return;

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(email).then(() => {
      showToast('Copied email to clipboard!');
    }).catch(() => {
      showToast('Email: vinaypratap4017@gmail.com');
    });
  });
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const subject = form.subject.value.trim();
    const message = form.message.value.trim();

    submitBtn.disabled = true;
    submitBtn.innerHTML = `Sending email...`;

    const payload = { name, email, subject, message };

    fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`Thank you, ${name}! Your email has been sent.`);
          form.reset();
        } else {
          throw new Error(data.error || 'Server error sending email');
        }
      })
      .catch(err => {
        console.warn('Resend backend error, using email client fallback:', err);
        showToast(`Redirecting to email client...`);
        window.location.href = `mailto:vinaypratap4017@gmail.com?subject=${encodeURIComponent('[Portfolio Contact] ' + subject)}&body=${encodeURIComponent(message)}`;
        form.reset();
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      });
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
