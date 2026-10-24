/**
 * Deepak Skin and Laser Cosmetic Clinic — appointment booking form
 *
 * Submits to CONFIG.GOOGLE_APPS_SCRIPT_URL (see js/config.js).
 * The frontend never talks to Google Calendar directly and never
 * holds any Google credentials — the Apps Script Web App is the
 * only thing with access to the clinic's calendar.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("bookingForm");
    if (!form) return;

    const submitBtn = document.getElementById("bookingSubmit");
    const submitText = document.getElementById("bookingSubmitText");
    const spinner = document.getElementById("bookingSpinner");
    const successBox = document.getElementById("bookingSuccess");
    const errorBox = document.getElementById("bookingError");
    const errorText = document.getElementById("bookingErrorText");

    const fields = {
      fullName: document.getElementById("fullName"),
      phone: document.getElementById("phone"),
      email: document.getElementById("email"),
      date: document.getElementById("date"),
      time: document.getElementById("time"),
      notes: document.getElementById("notes"),
    };

    // Preferred date can't be in the past
    fields.date.min = new Date().toISOString().split("T")[0];

    // Snapshot of every time option as originally written in the HTML
    // (value + label), captured once before any filtering/labeling runs.
    // Every re-render below rebuilds the dropdown from this list, so
    // switching dates always starts from a clean slate.
    const allTimeOptions = Array.from(fields.time.options).map((opt) => ({
      value: opt.value,
      label: opt.textContent,
    }));

    const validators = {
      fullName: (v) => {
        if (!v.trim()) return "Please enter your full name.";
        if (v.trim().length < 2) return "Name looks too short.";
        if (!/^[a-zA-Z\u00C0-\u017F' -]+$/.test(v.trim())) return "Name can only contain letters, spaces and hyphens.";
        return "";
      },
      phone: (v) => {
        if (!v.trim()) return "Please enter a phone number.";
        const digits = v.replace(/[^\d+]/g, "");
        if (!/^\+?[0-9]{7,15}$/.test(digits)) return "Enter a valid phone number (7–15 digits).";
        return "";
      },
      email: (v) => {
        if (!v.trim()) return "Please enter your email address.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Enter a valid email address.";
        return "";
      },
      date: (v) => {
        if (!v) return "Please choose a preferred date.";
        const chosen = new Date(v + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (chosen < today) return "Please choose a future date.";
        return "";
      },
      time: (v) => {
        if (!v) return "Please choose a preferred time.";
        return "";
      },
    };

    function showFieldError(name, message) {
      const el = fields[name];
      const errEl = document.getElementById("err-" + name);
      if (!el || !errEl) return;
      errEl.textContent = message;
      el.classList.toggle("invalid", Boolean(message));
      el.setAttribute("aria-invalid", message ? "true" : "false");
    }

    function validateField(name) {
      const message = validators[name](fields[name].value);
      showFieldError(name, message);
      return !message;
    }

    Object.keys(validators).forEach((name) => {
      fields[name].addEventListener("blur", () => validateField(name));
      fields[name].addEventListener("input", () => {
        if (fields[name].classList.contains("invalid")) validateField(name);
      });
    });

    // Converts a time-select option's value, e.g. "09:00 AM", into minutes
    // since midnight so it can be compared against the current clock time.
    function timeValueToMinutes(value) {
      const [time, meridiem] = value.trim().split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      const m = (meridiem || "").toUpperCase();
      if (m === "PM" && hours !== 12) hours += 12;
      if (m === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    // Rebuilds the time <select> from the original option list, dropping
    // any slot that has already passed today entirely (not shown at all —
    // for a future date every slot is kept, since none of them are "past").
    // Slots already booked are kept but disabled and colored, with
    // " — Filled" appended to the label so it's clear at a glance.
    function renderTimeOptions(bookedSet) {
      const timeSelect = fields.time;
      const previousValue = timeSelect.value;
      const dateValue = fields.date.value;
      const todayStr = new Date().toISOString().split("T")[0];
      const isToday = dateValue === todayStr;
      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

      // Keep the "Select a time" placeholder (value === "") as-is; only
      // rebuild the real time options after it.
      const placeholder = Array.from(timeSelect.options).find((o) => !o.value);
      timeSelect.innerHTML = "";
      if (placeholder) timeSelect.appendChild(placeholder);

      allTimeOptions.forEach(({ value, label }) => {
        if (!value) return; // the placeholder was already re-added above
        if (isToday && timeValueToMinutes(value) <= nowMinutes) return; // drop past times entirely

        const opt = document.createElement("option");
        opt.value = value;
        const isFilled = bookedSet.has(value.trim().toUpperCase());
        if (isFilled) {
          opt.textContent = `${label} — Filled`;
          opt.disabled = true;
          opt.style.color = "#dc2626"; // red so filled slots stand out at a glance
        } else {
          opt.textContent = label;
        }
        timeSelect.appendChild(opt);
      });

      // Keep the previous selection if it's still valid and open; otherwise
      // clear it and let the user know why.
      const stillValid = Array.from(timeSelect.options).some(
        (o) => o.value === previousValue && !o.disabled
      );
      if (previousValue && !stillValid) {
        timeSelect.value = "";
        if (bookedSet.has(previousValue.trim().toUpperCase())) {
          showFieldError("time", "That time was just booked — please pick another.");
        } else {
          showFieldError("time", "That time has already passed — please pick another.");
        }
      } else {
        timeSelect.value = previousValue;
      }
    }

    // Ask the Apps Script backend which times are already booked for the
    // chosen date, then re-render the dropdown (dropping past times and
    // marking booked ones) accordingly. This is a convenience layer only —
    // the real double-booking guard lives in doPost on the server, so if
    // this check fails or is skipped, the worst case is a patient finds
    // out at submit time instead of before.
    async function refreshTimeAvailability() {
      const dateValue = fields.date.value;
      const timeStatus = document.getElementById("timeAvailabilityStatus");
      if (!fields.time) return;

      if (!dateValue) {
        renderTimeOptions(new Set());
        return;
      }

      // Always re-render for past-time filtering, even if the availability
      // endpoint isn't configured yet — that part needs no server call.
      if (
        !CONFIG.GOOGLE_APPS_SCRIPT_URL ||
        CONFIG.GOOGLE_APPS_SCRIPT_URL.includes("REPLACE_WITH_YOUR_DEPLOYMENT_ID")
      ) {
        renderTimeOptions(new Set());
        return;
      }

      if (timeStatus) timeStatus.textContent = "Checking availability…";

      try {
        const url =
          CONFIG.GOOGLE_APPS_SCRIPT_URL +
          "?action=availability&date=" +
          encodeURIComponent(dateValue);
        const response = await fetch(url);
        const result = await response.json();

        const booked =
          result && result.success !== false
            ? new Set((result.bookedTimes || []).map((t) => t.trim().toUpperCase()))
            : new Set(); // fail open

        renderTimeOptions(booked);
      } catch (err) {
        // Network/CORS failure here shouldn't block booking — the
        // server-side conflict check on submit is the real safety net.
        console.error("Availability check failed:", err);
        renderTimeOptions(new Set());
      } finally {
        if (timeStatus) timeStatus.textContent = "";
      }
    }

    fields.date.addEventListener("change", refreshTimeAvailability);

    function validateAll() {
      let valid = true;
      Object.keys(validators).forEach((name) => {
        if (!validateField(name)) valid = false;
      });
      return valid;
    }

    function setLoading(isLoading) {
      submitBtn.disabled = isLoading;
      spinner.classList.toggle("hidden", !isLoading);
      submitText.textContent = isLoading ? "Booking your visit..." : "Confirm Appointment";
    }

    function hideAlerts() {
      successBox.hidden = true;
      errorBox.hidden = true;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlerts();

      if (!validateAll()) {
        const firstInvalid = form.querySelector(".invalid");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      if (
        !CONFIG.GOOGLE_APPS_SCRIPT_URL ||
        CONFIG.GOOGLE_APPS_SCRIPT_URL.includes("REPLACE_WITH_YOUR_DEPLOYMENT_ID")
      ) {
        errorText.textContent =
          "Online booking isn't configured yet. Please call the clinic to book directly.";
        errorBox.hidden = false;
        return;
      }

      const payload = {
        fullName: fields.fullName.value.trim(),
        phone: fields.phone.value.trim(),
        email: fields.email.value.trim(),
        date: fields.date.value,
        time: fields.time.value,
        notes: fields.notes.value.trim(),
        clinic: CONFIG.CLINIC_NAME,
        clinicEmail: CONFIG.CLINIC_EMAIL,
        timezone: CONFIG.BOOKING_TIMEZONE,
        source: "website",
        submittedAt: new Date().toISOString(),
      };

      setLoading(true);

      try {
        // Apps Script Web Apps don't send CORS preflight-friendly responses
        // for application/json, so we use text/plain — Apps Script reads it
        // fine via JSON.parse(e.postData.contents) on the server side.
        const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });

        let result = null;
        try {
          result = await response.json();
        } catch (_) {
          // Some Apps Script deployments return plain text; treat any
          // 2xx response without JSON as a success.
        }

        if (response.ok && (!result || result.success !== false)) {
          form.reset();
          successBox.hidden = false;
          successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } else {
          throw new Error((result && result.message) || "Booking request failed.");
        }
      } catch (err) {
        console.error("Booking submission failed:", err);
        // If the server responded with a specific reason, show that —
        // it's far more useful for diagnosing config problems. Only
        // fall back to the generic message for genuine network/CORS
        // failures (those throw a TypeError with no useful message).
        const isNetworkFailure = err instanceof TypeError;
        errorText.textContent = !isNetworkFailure && err.message
          ? err.message
          : "We couldn't reach the booking server. Please call or WhatsApp the clinic and we'll book you in directly.";
        errorBox.hidden = false;
      } finally {
        setLoading(false);
      }
    });
  });
})();