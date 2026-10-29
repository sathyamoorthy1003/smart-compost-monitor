/* ============================================
   MAIN JS — Navigation & Interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // === Navbar scroll effect ===
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // === Mobile nav toggle ===
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      navToggle.classList.toggle('active');
    });

    // Close nav on link click
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
      });
    });
  }

  // === Smooth scroll for anchor links ===
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; // navbar height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // === Intersection Observer for animations ===
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card, .step, .test-card, .arch-card, .metric-card').forEach(el => {
    el.classList.add('animate-in');
    observer.observe(el);
  });

  // === Active nav link based on scroll ===
  const sections = document.querySelectorAll('section[id]');
  if (sections.length > 0) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY + 100;
      sections.forEach(section => {
        const top = section.offsetTop - 100;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (link) {
          if (scrollY >= top && scrollY < top + height) {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        }
      });
    });
  }
});

// === Animation CSS (injected) ===
const animStyle = document.createElement('style');
animStyle.textContent = `
  .animate-in {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  .animate-in.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .animate-in:nth-child(2) { transition-delay: 0.1s; }
  .animate-in:nth-child(3) { transition-delay: 0.2s; }
  .animate-in:nth-child(4) { transition-delay: 0.3s; }
  .animate-in:nth-child(5) { transition-delay: 0.4s; }
  .animate-in:nth-child(6) { transition-delay: 0.5s; }

  .nav-toggle.active span:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }
  .nav-toggle.active span:nth-child(2) {
    opacity: 0;
  }
  .nav-toggle.active span:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
  }
`;
document.head.appendChild(animStyle);
