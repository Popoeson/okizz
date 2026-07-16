document.addEventListener('DOMContentLoaded', () => {

  // Render Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Footer year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.innerHTML = isOpen ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
      if (window.lucide) lucide.createIcons();
    });

    // Close mobile nav after clicking a link
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i data-lucide="menu"></i>';
        if (window.lucide) lucide.createIcons();
      });
    });
  }

  // Sticky header shadow on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.style.boxShadow = window.scrollY > 8 ? '0 6px 20px rgba(11,15,20,0.06)' : 'none';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Scroll-reveal for cards/sections
  const revealTargets = document.querySelectorAll(
    '.vm-card, .pillar, .program-card, .beneficiary-card, .involved-card, .origin-card'
  );
  if ('IntersectionObserver' in window && revealTargets.length) {
    revealTargets.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealTargets.forEach(el => observer.observe(el));
  }

  // Blueprint illustrations: scatter grid dots (page may have more than one)
  document.querySelectorAll('.bp-dots').forEach(dotsGroup => {
    const cols = 10, rows = 8, spacingX = 40, spacingY = 42.5;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', c * spacingX);
        dot.setAttribute('cy', r * spacingY);
        dot.setAttribute('r', 1);
        dot.setAttribute('fill', 'currentColor');
        dot.setAttribute('opacity', '0.12');
        dotsGroup.appendChild(dot);
      }
    }
  });

  // Donation frequency toggle (visual only — no payment processing yet)
  document.querySelectorAll('.freq-toggle').forEach(toggle => {
    toggle.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  // Placeholder contact form handling
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.innerHTML = 'Message noted (placeholder)';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
        form.reset();
      }, 2200);
    });
  }

});
