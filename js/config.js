/**
 * ============================================================
 *  Deepak Skin and Laser Cosmetic Clinic — site configuration
 * ============================================================
 *  Edit the values below to connect the booking form to your
 *  own Google Apps Script Web App and update clinic details.
 *  No other file needs to change.
 *
 *  How GOOGLE_APPS_SCRIPT_URL works:
 * 
 *  1. Deploy the script in /appscript/Code.gs as a Web App
 *     (Deploy → New deployment → Web app).
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  2. Copy the deployment URL (ends in /exec) into the value
 *     below.
 *  3. The Apps Script creates the Google Calendar event and
 *     emails the patient — the browser never touches Google
 *     credentials or the Calendar API directly.
 * ============================================================
 */
const CONFIG = {
  // Clinic identity
  CLINIC_NAME: "Deepak Skin and Laser Cosmetic Clinic",

  // Booking endpoint — replace with your deployed Apps Script /exec URL
  GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzL0Y9tXudtTusxeEOhu9f7YcxQN8J_F_7jQegH0YvAF9eLnyFK9hbW8pG-XZQUsDpfJg/exec",

  // Contact details shown across the site
  CLINIC_EMAIL: "kodamabhilashabhi@gmail.com",
  CLINIC_PHONE_DISPLAY: "+91 9000088112",
  CLINIC_PHONE_TEL: "+919000088112",      // used for tel: links, digits + leading +
  CLINIC_WHATSAPP_NUMBER: "7680872294", // digits only, country code, no +

  CLINIC_ADDRESS: "Hanuman Temple, H.No.7-1-168, New Bus Stand Rd, opp. Hanamkonda, Hanamkonda, Telangana 506001",
  CLINIC_ADDRESS_MAPS_URL: "https://www.google.com/maps/search/?api=1&query=Deepak+Skin+and+Laser+Cosmetic+Clinic&query_place_id=0x3a334f7ef9eeb7ef%3A0xa13473383d9fe340",

  // Google Maps embed URL (Maps → Share → Embed a map → copy the src="" value)
 GOOGLE_MAPS_EMBED_URL:
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3908.13385702674!2d79.56459227523236!3d18.002143284804575!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a334f7ef9eeb7ef%3A0xa13473383d9fe340!2sDeepak%20Skin%20and%20Laser%20Cosmotic%20Clinic!5e1!3m2!1sen!2sin!4v1788249134379!5m2!1sen!2sin",

  // Business hours (used only for display / default WhatsApp message)
  BUSINESS_HOURS: "Mon–Fri 9am–6pm · Sat 9am–2pm",

  // Timezone used when formatting the appointment for the Apps Script payload
BOOKING_TIMEZONE: "Asia/Kolkata",   // was "India/Kolkata",

  // Structured hours used to show real open/closed status on the homepage
  // Format: day number (0=Sun...6=Sat) → [openHour, closeHour] in 24hr, or null if closed
 BUSINESS_HOURS: "Mon–Fri 9am–6pm · Sat 9am–2pm",
  HOURS: {
    0: null,
    1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18],
    6: [9, 14],
  },
};