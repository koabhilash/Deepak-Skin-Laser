/**
 * ============================================================
 *  Deepak Skin and Laser Cosmetic Clinic — Booking Web App (Google Apps Script)
 * ============================================================
 *  Deploy this file as a Web App and paste the /exec URL into
 *  js/config.js as GOOGLE_APPS_SCRIPT_URL.
 *
 *  SETUP
 *  1. Go to https://script.google.com and create a new project.
 *  2. Paste this file's contents into Code.gs.
 *  3. Update CLINIC_CALENDAR_ID and CLINIC_EMAIL below.
 *       - Leave CLINIC_CALENDAR_ID as "" to use the account's own
 *         default calendar. Only set it if you want events created
 *         on a *different* calendar (use that calendar's ID from
 *         Google Calendar → Settings → Integrate calendar).
 *  4. IMPORTANT — Project time zone must match DEFAULT_TIMEZONE below.
 *       - In the Apps Script editor: Project Settings (gear icon) →
 *         "Time zone" → set it to the same value as DEFAULT_TIMEZONE
 *         (Asia/Kolkata). Apps Script's `new Date(y, m, d, h, min)`
 *         always interprets those numbers using the *project's* time
 *         zone, not any string passed around in code — so if this is
 *         left as the default (often Etc/GMT or America/Los_Angeles),
 *         every appointment will be booked at the wrong hour even
 *         though the confirmation email text looks correct.
 *  5. Deploy → New deployment → type: Web app.
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  6. Copy the resulting URL (ends in /exec) into config.js.
 *  7. Authorize the script when prompted (Calendar + Mail scopes).
 *  8. Test it: open the /exec URL directly in a browser — you
 *     should see {"status":"ok", ...}. If you get an error page
 *     instead, the deployment access isn't set to "Anyone".
 *  9. After a real booking attempt, check Executions in the Apps
 *     Script left sidebar for the actual server-side error if
 *     something still isn't working.
 *
 *  SECURITY NOTE
 *  This script runs under the clinic owner's Google account and
 *  is the only thing with Calendar access. The website frontend
 *  only ever sends form data here over HTTPS — no API keys or
 *  Google credentials are ever exposed to the browser.
 * ============================================================
 */

const CLINIC_CALENDAR_ID = ""; // or a specific calendar's ID
const CLINIC_EMAIL = "kodamabhilashabhi@gmail.com"; // clinic-side notification inbox
const CLINIC_NAME = "Deepak Skin and Laser Cosmetic Clinic"; // must match config.js CLINIC_NAME
const APPOINTMENT_DURATION_MINUTES = 45; // adjust if skin/laser sessions run longer than dental visits
const DEFAULT_TIMEZONE = "Asia/Kolkata";
// NOTE: this constant only controls how dates/times are *formatted* in
// emails (Utilities.formatDate honors it). It does NOT control how the
// Date object itself is constructed in parseAppointmentDateTime() below —
// that always uses the Apps Script project's own time zone setting. Keep
// the project's time zone (Project Settings → Time zone) equal to this
// value or bookings will land on the wrong hour. See setup step 4 above.


// GET handler. Visiting the /exec URL directly with no params is a
// simple way to sanity-check the deployment. Add ?action=availability
// &date=YYYY-MM-DD to ask which times are already booked that day —
// this is what the booking form calls before showing the time list.
function doGet(e) {
  if (e && e.parameter && e.parameter.action === "availability" && e.parameter.date) {
    return getAvailability(e.parameter.date);
  }
  return jsonResponse({ status: "ok", message: "Booking endpoint is live. POST appointment data here." });
}

function getAvailability(dateStr) {
  try {
    const calendar = CLINIC_CALENDAR_ID
      ? CalendarApp.getCalendarById(CLINIC_CALENDAR_ID)
      : CalendarApp.getDefaultCalendar();

    if (!calendar) {
      return jsonResponse({
        success: false,
        message: "Could not access the clinic calendar. Check CLINIC_CALENDAR_ID in Code.gs.",
      });
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

    const events = calendar.getEvents(dayStart, dayEnd);
    // Ignore all-day events (holidays, personal all-day entries, etc.) —
    // they'd otherwise be included here with a start time that never
    // matches any actual time-slot option, so the dropdown wouldn't show
    // them as filled even though doPost's conflict check (below) would
    // still block against them. Only real timed events represent an
    // actual booked slot.
    const timedEvents = events.filter((ev) => !ev.isAllDayEvent());
    // Formatted the same way the option text in the form uses,
    // e.g. "09:00 AM", so the frontend can match on it directly.
    const bookedTimes = timedEvents.map((ev) =>
      Utilities.formatDate(ev.getStartTime(), DEFAULT_TIMEZONE, "hh:mm a")
    );

    return jsonResponse({ success: true, date: dateStr, bookedTimes: bookedTimes });
  } catch (err) {
    console.error("Availability check failed: " + err.message + "\n" + err.stack);
    return jsonResponse({ success: false, message: "Server error: " + err.message });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, message: "No data received by the server." });
    }

    const data = JSON.parse(e.postData.contents);

    const errors = validate(data);
    if (errors.length) {
      return jsonResponse({ success: false, message: errors.join(" ") });
    }

    const timezone = data.timezone || DEFAULT_TIMEZONE;
    const startTime = parseAppointmentDateTime(data.date, data.time, timezone);

    // Defense in depth: booking.js already blocks past dates client-side,
    // but the server should never trust that. A grace window of a few
    // minutes avoids rejecting a booking that was valid when the user
    // clicked submit but ticked over the minute by the time it arrives.
    const now = new Date();
    if (startTime.getTime() < now.getTime() - 5 * 60000) {
      return jsonResponse({
        success: false,
        message: "That date/time is in the past. Please choose a future slot.",
      });
    }

    const endTime = new Date(startTime.getTime() + APPOINTMENT_DURATION_MINUTES * 60000);

    // "" (default) uses the script owner's primary calendar. Apps
    // Script's CalendarApp does NOT accept "primary" as a literal ID
    // the way the REST Calendar API does — that would silently fail.
    const calendar = CLINIC_CALENDAR_ID
      ? CalendarApp.getCalendarById(CLINIC_CALENDAR_ID)
      : CalendarApp.getDefaultCalendar();

    if (!calendar) {
      return jsonResponse({
        success: false,
        message: "Could not access the clinic calendar. Check CLINIC_CALENDAR_ID in Code.gs.",
      });
    }

    // Guard against two patients booking the same slot. This is the
    // real safety net — it applies even if the frontend's availability
    // check was skipped, stale, or bypassed entirely. All-day events are
    // ignored here too (see getAvailability) so an unrelated all-day
    // calendar entry — a holiday, a personal reminder, etc. — doesn't
    // silently block every slot on that date.
    const conflicts = calendar.getEvents(startTime, endTime).filter((ev) => !ev.isAllDayEvent());
    if (conflicts.length > 0) {
      console.error(
        "Conflict blocked booking for " + startTime + " — overlapping event(s): " +
        conflicts.map((ev) => ev.getTitle() + " (" + ev.getStartTime() + " - " + ev.getEndTime() + ")").join(", ")
      );
      return jsonResponse({
        success: false,
        message: "That time slot was just booked by someone else. Please choose a different time.",
      });
    }

    const event = calendar.createEvent(
      `${CLINIC_NAME} Appointment — ${data.fullName}`,
      startTime,
      endTime,
      {
        description:
          `Patient: ${data.fullName}\n` +
          `Phone: ${data.phone}\n` +
          `Email: ${data.email}\n` +
          `Notes: ${data.notes || "—"}\n\n` +
          `Booked via ${CLINIC_NAME} website.`,
        guests: data.email,
        sendInvites: true,
      }
    );

    const formattedDateTime = Utilities.formatDate(startTime, timezone, "EEEE, MMMM d 'at' h:mm a");

    // Email 1 — sent to the PATIENT, confirming their appointment.
    MailApp.sendEmail({
      to: data.email,
      subject: `Your appointment at ${CLINIC_NAME} is confirmed`,
      name: CLINIC_NAME, // sets the "From" display name shown to the patient
      body:
        `Hi ${data.fullName},\n\n` +
        `Your appointment at ${CLINIC_NAME} is confirmed for ${formattedDateTime}.\n\n` +
        `A calendar invite has also been sent to this email.\n\n` +
        `If you need to reschedule, just reply to this email or call us.\n\n` +
        `See you soon,\n${CLINIC_NAME}`,
    });

    // Email 2 — sent to the CLINIC/doctor, with full patient details so
    // staff know who's coming in and why, without digging through Calendar.
    MailApp.sendEmail({
      to: CLINIC_EMAIL,
      subject: `New appointment booked — ${data.fullName} (${formattedDateTime})`,
      name: CLINIC_NAME, // sets the "From" display name shown to the clinic
      body:
        `A new appointment was booked through the website.\n\n` +
        `Patient: ${data.fullName}\n` +
        `Phone: ${data.phone}\n` +
        `Email: ${data.email}\n` +
        `Date & time: ${formattedDateTime}\n` +
        `Notes from patient: ${data.notes ? data.notes : "(none provided)"}\n\n` +
        `This appointment has already been added to the calendar and the patient has received a confirmation email.`,
    });

    return jsonResponse({ success: true, eventId: event.getId() });
  } catch (err) {
    console.error("Booking failed: " + err.message + "\n" + err.stack);
    return jsonResponse({ success: false, message: "Server error: " + err.message });
  }
}

function validate(data) {
  const errors = [];
  if (!data.fullName || String(data.fullName).trim().length < 2) errors.push("Invalid name.");
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Invalid email.");
  if (!data.phone || !/^\+?[0-9]{7,15}$/.test(String(data.phone).replace(/[^\d+]/g, "")))
    errors.push("Invalid phone number.");
  if (!data.date) errors.push("Missing date.");
  if (!data.time) errors.push("Missing time.");
  return errors;
}

function parseAppointmentDateTime(dateStr, timeStr, timezone) {
  // dateStr: "YYYY-MM-DD", timeStr: "hh:mm AM/PM"
  // NOTE: `timezone` is accepted (and passed on to Utilities.formatDate
  // later for display) but new Date(y, m, d, h, min) below is always
  // interpreted in the Apps Script project's own time zone setting —
  // see the setup note about matching Project Settings to DEFAULT_TIMEZONE.
  const [time, meridiem] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}