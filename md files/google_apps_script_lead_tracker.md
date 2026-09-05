# Google Apps Script Lead Tracker

This script runs as a Google Apps Script Web App attached to your Google Sheet to log customer interactions through all 5 steps of the swim registration wizard.

## Sheet Column Layout (17 Columns)

| Column | Header | Description |
|---|---|---|
| A | Submitted (CT) | Timestamp formatted in Central Time |
| B | Parent | Parent first and last name |
| C | Phone | Parent 10-digit mobile phone |
| D | Email | Parent email address |
| E | SMS consent | "Yes" or "No" |
| F | Swimmers | Number of swimmers |
| G | Swimmer detail | Swimmer names, DOBs, gender, and pace |
| H | Pools | Pool location(s) and selected days of the week (e.g. `Mansfield (Tuesday, Thursday)`) |
| I | Referral | Referral source |
| J | Message | Latest summary message |
| K | Lead ID | Unique session ID used to update row across steps without duplicates |
| L | Enrollment LInk | Pre-populated Jackrabbit registration link |
| M | Step 1 (Quote) | Retained tuition quote and swimmer pace summary |
| N | Step 2 (Contact) | Retained contact details and swimmer profiles |
| O | Step 3 (Placement) | Retained assessed placement levels for each swimmer |
| P | Step 4 (Schedule) | Retained preferred locations and selected days of the week |
| Q | Step 5 (Final Action) | Retained final action (e.g. Book 2-Class Trial with class location, day, time, level, and Jackrabbit Class ID) |

## Apps Script Code (`Code.gs`)

```javascript
/**
 * British Swim School - Lead & Booking Tracker (Apps Script)
 *
 * Sheet Column Layout (17 Columns):
 * Col A (1):  Submitted (CT)
 * Col B (2):  Parent
 * Col C (3):  Phone
 * Col D (4):  Email
 * Col E (5):  SMS consent
 * Col F (6):  Swimmers
 * Col G (7):  Swimmer detail
 * Col H (8):  Pools (Locations + Selected Days of Week)
 * Col I (9):  Referral
 * Col J (10): Message (Latest Summary)
 * Col K (11): Lead ID (Used to upsert & match across all 5 steps)
 * Col L (12): Enrollment LInk (Jackrabbit pre-populated registration URL)
 * Col M (13): Step 1 (Quote)
 * Col N (14): Step 2 (Contact)
 * Col O (15): Step 3 (Placement)
 * Col P (16): Step 4 (Schedule)
 * Col Q (17): Step 5 (Final Action)
 *
 * Deployment Instructions:
 * 1. Open your Google Sheet that collects website leads.
 * 2. Click "Extensions" > "Apps Script".
 * 3. Replace all code in Code.gs with this script.
 * 4. Click Save (Ctrl+S).
 * 5. Click "Deploy" > "Manage deployments".
 * 6. Click the pencil icon (Edit), choose "New version", and click "Deploy".
 */

var SHEET_NAME = 'Leads';
var NOTIFY_EMAIL = 'goswimarlsgpra@britishswimschool.com';

var HEADERS = [
  'Submitted (CT)',
  'Parent',
  'Phone',
  'Email',
  'SMS consent',
  'Swimmers',
  'Swimmer detail',
  'Pools',
  'Referral',
  'Message',
  'Lead ID',
  'Enrollment LInk',
  'Step 1 (Quote)',
  'Step 2 (Contact)',
  'Step 3 (Placement)',
  'Step 4 (Schedule)',
  'Step 5 (Final Action)'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Prevent concurrent write collisions

    var book = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = book.getSheetByName(SHEET_NAME) || book.getActiveSheet();
    var contents = e.postData.contents;
    var data = JSON.parse(contents);

    var leadId = data.leadId || ('lead_' + new Date().getTime());
    var now = new Date();
    
    // Format timestamp in Central Time (CT)
    var submittedAt = Utilities.formatDate(now, 'America/Chicago', 'yyyy-MM-dd h:mm:ss a');

    // Automatically ensure header row is up to date
    var currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    var headersNeedUpdate = false;
    for (var h = 0; h < HEADERS.length; h++) {
      if (currentHeaders[h] !== HEADERS[h]) {
        headersNeedUpdate = true;
        break;
      }
    }
    if (headersNeedUpdate) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    // Search for existing row matching leadId in Column K (11)
    var foundRow = -1;
    var lastRow = sheet.getLastRow();
    var existingRow = null;

    if (lastRow > 1) {
      var leadIds = sheet.getRange(2, 11, lastRow - 1, 1).getValues();
      for (var i = 0; i < leadIds.length; i++) {
        if (String(leadIds[i][0]).trim() === String(leadId).trim()) {
          foundRow = i + 2; // 1-indexed, starting at row 2
          existingRow = sheet.getRange(foundRow, 1, 1, HEADERS.length).getValues()[0];
          break;
        }
      }
    }

    // Family & Contact details
    var family = data.family || {};
    var newParent = [family.firstName, family.lastName].filter(Boolean).join(' ').trim();
    var parentName = newParent || (existingRow ? existingRow[1] : '');
    if (!parentName && data.message && data.message.indexOf('Step 1') !== -1) {
      parentName = '(Quote Only)';
    }

    var phone = family.phone || (existingRow ? existingRow[2] : '');
    var email = family.email || (existingRow ? existingRow[3] : '');
    var smsConsent = '';
    if (family.smsConsent === true || family.smsConsent === 'yes') {
      smsConsent = 'Yes';
    } else if (family.smsConsent === false) {
      smsConsent = 'No';
    } else if (existingRow && existingRow[4]) {
      smsConsent = existingRow[4];
    }

    // Swimmers count & details
    var swimmerCount = data.swimmerCount || (data.swimmers ? data.swimmers.length : 0);
    if (!swimmerCount && existingRow && existingRow[5]) {
      swimmerCount = existingRow[5];
    }

    var swimmerDetailList = [];
    if (data.swimmers && data.swimmers.length > 0) {
      data.swimmers.forEach(function(s) {
        var parts = [s.firstName || 'Swimmer'];
        var meta = [];
        if (s.dob) meta.push('DOB: ' + s.dob);
        if (s.gender) meta.push(s.gender);
        if (s.paceLabel || s.pace) {
          var freq = s.paceLabel || (s.pace === 'unlimited' ? 'Unlimited Swim' : (s.pace === 'standard' ? '2x per week' : (s.pace === 'dolphin_private' ? 'Private (1x/wk)' : (s.pace === 'dolphin_semi' ? 'Semi-Private (1x/wk)' : '1x per week'))));
          meta.push('Freq: ' + freq);
        }
        if (meta.length > 0) parts.push('(' + meta.join(', ') + ')');
        if (s.estimatedLevel || s.selectedLevel) parts.push('- Level: ' + (s.estimatedLevel || s.selectedLevel));
        swimmerDetailList.push('  ' + parts.join(' '));
      });
    }
    var swimmerDetail = swimmerDetailList.length > 0
      ? swimmerDetailList.join('\n')
      : (existingRow ? existingRow[6] : '');

    // Pools + Days of the Week
    var pools = '';
    if (data.poolsFormatted && data.poolsFormatted !== 'Any Location') {
      pools = data.poolsFormatted;
    } else if (data.poolsFormatted && !existingRow) {
      pools = data.poolsFormatted;
    } else if (existingRow && existingRow[7] && existingRow[7] !== 'Any Location') {
      pools = existingRow[7];
    } else {
      pools = data.poolsFormatted || (existingRow ? existingRow[7] : '') || 'Any Location';
    }

    // Referral
    var referral = data.referral || {};
    var referralSource = referral.source || '';
    if (referral.friendName) referralSource += ' (Referred by: ' + referral.friendName + ')';
    if (referral.other) referralSource += ' (' + referral.other + ')';
    if (!referralSource && existingRow && existingRow[8]) {
      referralSource = existingRow[8];
    }

    // Message (Latest overall log summary)
    var message = data.message || (existingRow ? existingRow[9] : '');

    // Column L: Enrollment LInk
    var enrollmentLink = data.bookingUrl || (existingRow ? existingRow[11] : '');

    // Retain each individual step's dedicated cell across progression
    var step1 = data.step1Details || (existingRow ? existingRow[12] : '');
    var step2 = data.step2Details || (existingRow ? existingRow[13] : '');
    var step3 = data.step3Details || (existingRow ? existingRow[14] : '');
    var step4 = data.step4Details || (existingRow ? existingRow[15] : '');
    var step5 = data.step5Details || (existingRow ? existingRow[16] : '');

    var rowValues = [
      submittedAt,      // Col A (1): Submitted (CT)
      parentName,       // Col B (2): Parent
      phone,            // Col C (3): Phone
      email,            // Col D (4): Email
      smsConsent,       // Col E (5): SMS consent
      swimmerCount,     // Col F (6): Swimmers
      swimmerDetail,    // Col G (7): Swimmer detail
      pools,            // Col H (8): Pools (Locations + Days)
      referralSource,   // Col I (9): Referral
      message,          // Col J (10): Message
      leadId,           // Col K (11): Lead ID
      enrollmentLink,   // Col L (12): Enrollment LInk
      step1,            // Col M (13): Step 1 (Quote)
      step2,            // Col N (14): Step 2 (Contact)
      step3,            // Col O (15): Step 3 (Placement)
      step4,            // Col P (16): Step 4 (Schedule)
      step5             // Col Q (17): Step 5 (Final Action)
    ];

    if (foundRow > 1) {
      // Update existing row in place (prevents duplicate rows, enriches each step)
      sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      // Insert new row for first step of new session
      sheet.appendRow(rowValues);
    }

    // When customer completes the final step (either Booking redirect or Scheduling Assistance), send email alert
    var action = data.action || '';
    var isFinalAction = (
      action.indexOf('Book 2-Class Trial') !== -1 ||
      action.indexOf('Scheduling Assistance') !== -1 ||
      message.indexOf('Step 5') !== -1 ||
      Boolean(step5)
    );

    if (isFinalAction && NOTIFY_EMAIL) {
      try {
        var isBooking = action.indexOf('Book 2-Class Trial') !== -1;
        var subject = (isBooking ? '🏊 Trial Booking Link Clicked: ' : '📋 Scheduling Assistance Request: ') + (parentName || 'New Family');
        var body = 'A parent just completed the swim finder on the website!\n\n' +
          'Action: ' + (step5 || action || message) + '\n' +
          'Parent: ' + (parentName || 'Not provided') + '\n' +
          'Phone: ' + (phone || 'Not provided') + '\n' +
          'Email: ' + (email || 'Not provided') + '\n' +
          'SMS Consent: ' + smsConsent + '\n\n' +
          '=== STEP 1 (QUOTE) ===\n' +
          (step1 || 'N/A') + '\n\n' +
          '=== STEP 2 (CONTACT & SWIMMERS) ===\n' +
          (step2 || swimmerDetail || 'N/A') + '\n\n' +
          '=== STEP 3 (PLACEMENT LEVELS) ===\n' +
          (step3 || 'N/A') + '\n\n' +
          '=== STEP 4 (SCHEDULE & LOCATIONS) ===\n' +
          'Pools & Days: ' + (pools || 'Any Location') + '\n' +
          (step4 ? step4 + '\n' : '') + '\n' +
          'Referral Source: ' + (referralSource || 'Website') + '\n\n' +
          '=== STEP 5 (FINAL ACTION & CLASS) ===\n' +
          (step5 || action || 'N/A') + '\n\n' +
          '=== JACKRABBIT ENROLLMENT LINK ===\n' +
          (enrollmentLink ? enrollmentLink : 'No direct link generated') + '\n\n' +
          'Lead ID: ' + leadId + '\n' +
          'Timestamp: ' + submittedAt;

        MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
      } catch (mailErr) {
        console.error('Email send failed: ' + mailErr);
      }
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', leadId: leadId, row: foundRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    if (lock) lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', service: 'bss-lead-tracker' }))
    .setMimeType(ContentService.MimeType.JSON);
}

```

## Deployment Steps

1. In your Google Sheet, click **Extensions > Apps Script**.
2. Paste the script above into **Code.gs**.
3. Click **Save** (disk icon or `Ctrl+S`).
4. Click **Deploy > Manage deployments**.
5. Click the **Pencil icon (Edit)** next to your active Web App deployment.
6. Under Version, select **New version**.
7. Click **Deploy**.
