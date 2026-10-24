/**
 * Deepak Skin and Laser Cosmetic Clinic — main site interactions
 * Dependency-free vanilla JS.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setupClinicStatus();
    populateConfig();
    setupHeaderScroll();
    setupMobileMenu();
    setupSmoothScrollAndActiveLink();
    setupScrollReveal();
    setupCounters();
    setupFlipCards();
    setupTestimonialCarousel();
    setupGalleryLightbox();
    setupFAQ();
    document.getElementById("year").textContent = new Date().getFullYear();
  }


  function setupClinicStatus() {
  const label = document.getElementById("clinicStatusLabel");
  const main = document.getElementById("clinicStatusMain");
  const sub = document.getElementById("clinicStatusSub");
  if (!label || typeof CONFIG === "undefined" || !CONFIG.HOURS) return;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const todayHours = CONFIG.HOURS[day];

  function formatHour(h) {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${period}`;
  }

  if (todayHours && hour >= todayHours[0] && hour < todayHours[1]) {
    label.textContent = "We're open now";
    main.textContent = `Until ${formatHour(todayHours[1])}`;
    sub.textContent = "Walk-ins welcome, or book below";
  } else {
    // Find the next open day (checks today's later hours first, then future days)
    let nextDay = day, daysAhead = 0;
    let found = null;
    for (let i = 0; i < 7; i++) {
      const checkDay = (day + i) % 7;
      const h = CONFIG.HOURS[checkDay];
      if (h && (i > 0 || hour < h[0])) {
        found = { day: checkDay, open: h[0] };
        daysAhead = i;
        break;
      }
    }
    const dayLabel = daysAhead === 0 ? "Today" : daysAhead === 1 ? "Tomorrow" : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][found.day];
    label.textContent = "Currently closed";
    main.textContent = found ? `${dayLabel}, ${formatHour(found.open)}` : "See hours below";
    sub.textContent = "Book online, we'll confirm by email";
  }
}
  /* ---------------- Config wiring ---------------- */
  function populateConfig() {
    if (typeof CONFIG === "undefined") return;

    // Nav / floating phone
    const navPhone = document.getElementById("navPhoneLink");
    if (navPhone) navPhone.href = "tel:" + CONFIG.CLINIC_PHONE_TEL;
    const navPhoneText = document.getElementById("navPhoneText");
    if (navPhoneText) navPhoneText.textContent = CONFIG.CLINIC_PHONE_DISPLAY;

    // Contact card
    setText("contactAddressText", CONFIG.CLINIC_ADDRESS);
    setText("contactPhoneText", CONFIG.CLINIC_PHONE_DISPLAY);
    setText("contactEmailText", CONFIG.CLINIC_EMAIL);

    const addrLink = document.getElementById("contactAddressLink");
    if (addrLink) addrLink.href = CONFIG.CLINIC_ADDRESS_MAPS_URL;

    const phoneLink = document.getElementById("contactPhoneLink");
    if (phoneLink) phoneLink.href = "tel:" + CONFIG.CLINIC_PHONE_TEL;

    const emailLink = document.getElementById("contactEmailLink");
    if (emailLink) emailLink.href = "mailto:" + CONFIG.CLINIC_EMAIL;

    const waLink = document.getElementById("contactWhatsappLink");
    if (waLink) {
      const msg = encodeURIComponent(
        `Hi ${CONFIG.CLINIC_NAME}, I'd like to book a skin/laser appointment.`
      );
      waLink.href = `https://wa.me/${CONFIG.CLINIC_WHATSAPP_NUMBER}?text=${msg}`;
    }

    const heroWaLink = document.getElementById("heroWhatsappLink");
    if (heroWaLink) {
      const msg = encodeURIComponent(
        `Hi ${CONFIG.CLINIC_NAME}, I'd like to book a skin/laser appointment.`
      );
      heroWaLink.href = `https://wa.me/${CONFIG.CLINIC_WHATSAPP_NUMBER}?text=${msg}`;
    }

    const map = document.getElementById("mapEmbed");
    if (map) map.src = CONFIG.GOOGLE_MAPS_EMBED_URL;

    // Footer
    setText("footerAddress", CONFIG.CLINIC_ADDRESS);
    setText("footerPhone", CONFIG.CLINIC_PHONE_DISPLAY);
    setText("footerEmail", CONFIG.CLINIC_EMAIL);

    document.title = `${CONFIG.CLINIC_NAME} — Advanced Skin & Laser Care You Can Trust`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ---------------- Header scroll state + progress bar ---------------- */
  function setupHeaderScroll() {
    const header = document.getElementById("siteHeader");
    const fill = document.getElementById("smileProgressFill");

    function onScroll() {
      const scrollY = window.scrollY || window.pageYOffset;
      header.classList.toggle("scrolled", scrollY > 30);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      fill.style.width = pct + "%";
    }
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- Mobile menu ---------------- */
  function setupMobileMenu() {
    const toggle = document.getElementById("menuToggle");
    const menu = document.getElementById("mobileMenu");
    const iconOpen = document.getElementById("menuIconOpen");
    const iconClose = document.getElementById("menuIconClose");

    function closeMenu() {
      menu.classList.add("hidden");
      iconOpen.classList.remove("hidden");
      iconClose.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
      const isOpen = !menu.classList.contains("hidden");
      if (isOpen) {
        closeMenu();
      } else {
        menu.classList.remove("hidden");
        iconOpen.classList.add("hidden");
        iconClose.classList.remove("hidden");
        toggle.setAttribute("aria-expanded", "true");
      }
    });

    menu.querySelectorAll("[data-mobile]").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  /* ---------------- Smooth scroll + active nav link ---------------- */
  function setupSmoothScrollAndActiveLink() {
    const navLinks = document.querySelectorAll("[data-nav]");
    const sections = Array.from(document.querySelectorAll("main section[id]"));

    navLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        const headerOffset = 96;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: "smooth" });
        history.replaceState(null, "", href);

        // If scrolling to the booking form, focus the first field for convenience
        if (href === "#booking") {
          setTimeout(() => {
            const nameField = document.getElementById("fullName");
            if (nameField) nameField.focus({ preventScroll: true });
          }, 550);
        }
      });
    });

    const desktopLinks = document.querySelectorAll('.nav-link[data-nav]');
    if ("IntersectionObserver" in window && sections.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = "#" + entry.target.id;
              desktopLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
      );
      sections.forEach((s) => observer.observe(s));
    }
  }

  /* ---------------- Scroll reveal ---------------- */
  function setupScrollReveal() {
    const items = document.querySelectorAll(".reveal-up");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in-view"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => observer.observe(el));
  }

  /* ---------------- Animated counters ---------------- */
  function setupCounters() {
    const counters = document.querySelectorAll(".counter");
    if (!counters.length) return;

    function animateCounter(el) {
      const target = parseInt(el.getAttribute("data-target"), 10) || 0;
      const duration = 1600;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target).toLocaleString();
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = target.toLocaleString();
        }
      }
      requestAnimationFrame(tick);
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCounter);
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => observer.observe(c));
  }

  /* ---------------- Treatment flip cards ---------------- */
  function setupFlipCards() {
    const cards = document.querySelectorAll(".flip-card");
    cards.forEach((card) => {
      card.addEventListener("click", (e) => {
        // Don't toggle flip when the CTA link on the back is clicked
        if (e.target.closest("a")) return;
        card.classList.toggle("flipped");
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.classList.toggle("flipped");
        }
      });
    });
  }

(function () {
  var stage = document.getElementById('resultsStage');
  if (!stage) return;
  var cards = Array.prototype.slice.call(stage.querySelectorAll('.result-card'));
  var dotsWrap = document.getElementById('resDots');
  var n = cards.length, active = 0;

  var dots = cards.map(function (_, i) {
    var b = document.createElement('button');
    b.setAttribute('aria-label', 'Show result ' + (i + 1));
    b.addEventListener('click', function () { go(i); });
    dotsWrap.appendChild(b);
    return b;
  });

  function render() {
    cards.forEach(function (c, i) {
      var off = ((i - active) % n + n) % n;      // 0..n-1
      if (off > n / 2) off -= n;                  // wrap to negative
      c.setAttribute('data-pos', off);
    });
    dots.forEach(function (d, i) { d.classList.toggle('active', i === active); });
  }
  function go(i) { active = (i + n) % n; render(); }

  document.getElementById('resPrev').addEventListener('click', function () { go(active - 1); });
  document.getElementById('resNext').addEventListener('click', function () { go(active + 1); });

  // click a background card to bring it forward
  cards.forEach(function (c, i) {
    c.addEventListener('click', function () { if (i !== active) go(i); });

    // before/after slider inside each card
    var range = c.querySelector('.rc-range');
    var before = c.querySelector('.rc-before');
    var handle = c.querySelector('.rc-handle');
    range.addEventListener('input', function () {
      before.style.clipPath = 'inset(0 ' + (100 - range.value) + '% 0 0)';
      handle.style.left = range.value + '%';
    });
  });

  // swipe on the stage (ignore drags that start on the slider)
  var startX = null;
  stage.addEventListener('touchstart', function (e) {
    startX = e.target.classList.contains('rc-range') ? null : e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
    startX = null;
  });

  render();
})();

  /* ---------------- Testimonials carousel ---------------- */
  function setupTestimonialCarousel() {
    const track = document.getElementById("testimonialTrack");
    const prevBtn = document.getElementById("testimonialPrev");
    const nextBtn = document.getElementById("testimonialNext");
    const dotsWrap = document.getElementById("testimonialDots");
    if (!track) return;

    const slides = Array.from(track.children);
    let index = 0;
    let autoplayTimer;

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.setAttribute("aria-label", "Go to testimonial " + (i + 1));
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function render() {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === index));
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
      restartAutoplay();
    }

    function restartAutoplay() {
      clearInterval(autoplayTimer);
      autoplayTimer = setInterval(() => goTo(index + 1), 6000);
    }

    prevBtn.addEventListener("click", () => goTo(index - 1));
    nextBtn.addEventListener("click", () => goTo(index + 1));

    // Swipe support
    let touchStartX = 0;
    track.addEventListener("touchstart", (e) => (touchStartX = e.touches[0].clientX), { passive: true });
    track.addEventListener(
      "touchend",
      (e) => {
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (delta > 40) goTo(index - 1);
        else if (delta < -40) goTo(index + 1);
      },
      { passive: true }
    );

    render();
    restartAutoplay();
  }

  /* ---------------- Gallery lightbox ---------------- */
  function setupGalleryLightbox() {
    const tiles = document.querySelectorAll(".gallery-tile");
    const lightbox = document.getElementById("lightbox");
    const lightboxTile = document.getElementById("lightboxTile");
    const lightboxCaption = document.getElementById("lightboxCaption");
    const closeBtn = document.getElementById("lightboxClose");
    if (!tiles.length || !lightbox) return;

    let lastFocused = null;

   function open(tile) {
  lastFocused = document.activeElement;
  const img = tile.querySelector("img");
  lightboxTile.innerHTML = img
    ? `<img src="${img.src}" alt="${tile.getAttribute("data-caption") || ""}" style="width:100%;height:100%;object-fit:cover;" />`
    : "";
  lightboxCaption.textContent = tile.getAttribute("data-caption") || "";
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  closeBtn.focus();
}
    function close() {
      lightbox.hidden = true;
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }

    tiles.forEach((tile) => tile.addEventListener("click", () => open(tile)));
    closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hidden) close();
    });
  }

  /* ---------------- FAQ accordion ---------------- */
  function setupFAQ() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach((item) => {
      const btn = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");

      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");

        items.forEach((other) => {
          other.classList.remove("open");
          other.querySelector(".faq-question").setAttribute("aria-expanded", "false");
          other.querySelector(".faq-answer").style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
          answer.style.maxHeight = answer.scrollHeight + 24 + "px";
        }
      });
    });
  }
})();