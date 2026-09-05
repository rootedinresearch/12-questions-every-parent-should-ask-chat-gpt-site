# Google Apps Script: Single-Row Lead Upsert & Notification

This script ensures that each customer session creates and updates **only ONE row** in the Google Sheet, dynamically updating the row as the customer progresses through the wizard.

---

## 1. How to Update Your Google Sheet & Script

1. Open your **Google Sheet** (the one collecting website leads).
2. Click **Extensions &rarr; Apps Script**.
3. Replace the entire contents of **`Code.gs`** with the script below (or copy from `apps-script-lead-log.gs` on your Desktop).
4. Click **Save** (Ctrl+S).
5. Click **Deploy &rarr; Manage deployments**.
6. Click the **Edit** (pencil) icon, select **New version**, and click **Deploy**.

---

## 2. Google Apps Script Code (`Code.gs`)

```javascript
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
  'Quoted Tuition',
  'Total Due Today',
  'Booking Link',
  'Final Action'
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

    var family = data.family || {};
    var parentName = [family.firstName, family.lastName].filter(Boolean).join(' ').trim();
    if (!parentName && data.message && data.message.indexOf('Step 1') !== -1) {
      parentName = '(Quote Only)';
    }
    var phone = family.phone || '';
    var email = family.email || '';
    var smsConsent = (family.smsConsent === true || family.smsConsent === 'yes') ? 'Yes' : (family.smsConsent === false ? 'No' : '');

    var swimmerCount = data.swimmerCount || (data.swimmers ? data.swimmers.length : 0);
    
    var swimmerDetailList = [];
    var poolsList = [];
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
        if (s.estimatedLevel || s.selectedLevel) parts.push('– Level: ' + (s.estimatedLevel || s.selectedLevel));
        swimmerDetailList.push('• ' + parts.join(' '));

        if (s.location) {
          poolsList.push(s.location);
        }
      });
    }
    var swimmerDetail = swimmerDetailList.join('\n');
    var pools = poolsList.join(', ');

    var referral = data.referral || {};
    var referralSource = referral.source || '';
    if (referral.friendName) referralSource += ' (Referred by: ' + referral.friendName + ')';
    if (referral.other) referralSource += ' (' + referral.other + ')';

    var quotedTuition = (data.quotedOngoingTuition !== undefined && data.quotedOngoingTuition !== null)
      ? '$' + Number(data.quotedOngoingTuition).toFixed(2) + '/mo'
      : '';
    var quotedTotalDue = (data.quotedFirstMonthTotal !== undefined && data.quotedFirstMonthTotal !== null)
      ? '$' + Number(data.quotedFirstMonthTotal).toFixed(2)
      : '';
    var quotedRegFee = (data.quotedRegistrationFee !== undefined && data.quotedRegistrationFee !== null)
      ? '$' + Number(data.quotedRegistrationFee).toFixed(2)
      : '';

    var message = data.message || '';
    var bookingUrl = data.bookingUrl || '';
    var action = data.action || '';

    // Ensure Header Row has all 15 columns
    var lastCol = sheet.getLastColumn();
    if (lastCol < HEADERS.length) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    }

    var rowValues = [
      submittedAt,
      parentName,
      phone,
      email,
      smsConsent,
      swimmerCount,
      swimmerDetail,
      pools,
      referralSource,
      message,
      leadId,
      quotedTuition,
      quotedTotalDue,
      bookingUrl,
      action
    ];

    // Search for existing row matching leadId in Column K (11)
    var foundRow = -1;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var leadIds = sheet.getRange(2, 11, lastRow - 1, 1).getValues();
      for (var i = 0; i < leadIds.length; i++) {
        if (String(leadIds[i][0]).trim() === String(leadId).trim()) {
          foundRow = i + 2; // 1-indexed, starting at row 2
          break;
        }
      }
    }

    if (foundRow > 1) {
      // Update existing row in place (prevents duplicate rows)
      sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      // Insert new row for first step of new session
      sheet.appendRow(rowValues);
    }

    // When customer completes the final step (either Booking redirect or Scheduling Assistance), send email alert
    var isFinalAction = (
      action.indexOf('Book 2-Class Trial') !== -1 ||
      action.indexOf('Scheduling Assistance') !== -1 ||
      message.indexOf('Step 5') !== -1
    );

    if (isFinalAction && NOTIFY_EMAIL) {
      try {
        var isBooking = action.indexOf('Book 2-Class Trial') !== -1;
        var subject = (isBooking ? '🎯 Trial Booking Link Clicked: ' : '📋 Scheduling Assistance Request: ') + (parentName || 'New Family');
        var body = 'A parent just completed the swim finder on the website!\n\n' +
          'Action: ' + (action || message) + '\n' +
          'Parent: ' + (parentName || 'Not provided') + '\n' +
          'Phone: ' + (phone || 'Not provided') + '\n' +
          'Email: ' + (email || 'Not provided') + '\n' +
          'SMS Consent: ' + smsConsent + '\n\n' +
          '=== INSTANT QUOTE SUMMARY ===\n' +
          'Quoted Ongoing Tuition: ' + (quotedTuition || 'N/A') + '\n' +
          'Quoted Total Due Today: ' + (quotedTotalDue || 'N/A') + (quotedRegFee ? ' (includes ' + quotedRegFee + ' annual registration fee)' : '') + '\n\n' +
          '=== SWIMMERS & PREFERRED LESSONS ===\n' +
          (swimmerDetail || 'None listed') + '\n\n' +
          'Pool Locations & Preferences: ' + (pools || 'Any Location') + '\n' +
          'Referral Source: ' + (referralSource || 'Website') + '\n\n' +
          '=== JACKRABBIT PRE-POPULATED BOOKING LINK ===\n' +
          (bookingUrl ? bookingUrl : 'No direct match generated') + '\n\n' +
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
