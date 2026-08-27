# Google Apps Script: Single-Row Lead Upsert & Notification

This script ensures that each customer session creates and updates **only ONE row** in the Google Sheet, dynamically updating the row as the customer progresses through the wizard.

---

## 1. How to Update Your Google Sheet & Script

1. Open your **Google Sheet** (the one collecting website leads).
2. Ensure **Column K** (the 11th column, right after `Message`) has the header: **`Lead ID`**.
3. In Google Sheets, click **Extensions &rarr; Apps Script**.
4. Replace the entire contents of **`Code.gs`** with the script below.
5. Click **Save** (💾).
6. Click **Deploy &rarr; Manage deployments**.
7. Click the **Edit** (pencil) icon, select **New version**, and click **Deploy**.

---

## 2. Google Apps Script Code (`Code.gs`)

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Prevent concurrent write collisions

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = e.postData.contents;
    var data = JSON.parse(contents);

    var leadId = data.leadId || ("lead_" + new Date().getTime());
    var now = new Date();
    
    // Format timestamp in Central Time (CT)
    var submittedAt = Utilities.formatDate(now, "America/Chicago", "yyyy-MM-dd h:mm:ss a");

    var family = data.family || {};
    var parentName = [family.firstName, family.lastName].filter(Boolean).join(" ").trim();
    var phone = family.phone || "";
    var email = family.email || "";
    var smsConsent = (family.smsConsent === true || family.smsConsent === "yes") ? "Yes" : (family.smsConsent === false ? "No" : "");

    var swimmerCount = data.swimmerCount || (data.swimmers ? data.swimmers.length : 0);
    
    var swimmerDetailList = [];
    var poolsList = [];
    if (data.swimmers && data.swimmers.length > 0) {
      data.swimmers.forEach(function(s) {
        var parts = [s.firstName || "Swimmer"];
        var meta = [];
        if (s.dob) meta.push("DOB: " + s.dob);
        if (s.gender) meta.push(s.gender);
        if (s.paceLabel || s.pace) {
          var freq = s.paceLabel || (s.pace === "unlimited" ? "Unlimited Swim" : (s.pace === "standard" ? "2x per week" : (s.pace === "dolphin_private" ? "Private (1x/wk)" : (s.pace === "dolphin_semi" ? "Semi-Private (1x/wk)" : "1x per week"))));
          meta.push("Freq: " + freq);
        }
        if (meta.length > 0) parts.push("(" + meta.join(", ") + ")");
        if (s.estimatedLevel || s.selectedLevel) parts.push("— Level: " + (s.estimatedLevel || s.selectedLevel));
        swimmerDetailList.push("• " + parts.join(" "));

        if (s.location) {
          poolsList.push(s.location);
        }
      });
    }
    var swimmerDetail = swimmerDetailList.join("\n");
    var pools = poolsList.join(", ");

    var referral = data.referral || {};
    var referralSource = referral.source || "";
    if (referral.friendName) referralSource += " (Referred by: " + referral.friendName + ")";
    if (referral.other) referralSource += " (" + referral.other + ")";

    var quotedTuition = data.quotedOngoingTuition !== undefined ? "$" + Number(data.quotedOngoingTuition).toFixed(2) + "/mo" : "";
    var quotedTotalDue = data.quotedFirstMonthTotal !== undefined ? "$" + Number(data.quotedFirstMonthTotal).toFixed(2) : "";
    var quotedRegFee = data.quotedRegistrationFee !== undefined ? "$" + Number(data.quotedRegistrationFee).toFixed(2) : "";

    var message = data.message || "";

    // Columns:
    // A (1): Submitted (CT)
    // B (2): Parent
    // C (3): Phone
    // D (4): Email
    // E (5): SMS consent
    // F (6): Swimmers
    // G (7): Swimmer detail
    // H (8): Pools
    // I (9): Referral
    // J (10): Message
    // K (11): Lead ID

    // Ensure Header Row has Lead ID in Column K
    var headers = sheet.getRange(1, 1, 1, 11).getValues()[0];
    if (!headers[10] || headers[10] === "") {
      sheet.getRange(1, 11).setValue("Lead ID");
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
      leadId
    ];

    // Search for existing row matching leadId in Column K (11)
    var foundRow = -1;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var leadIds = sheet.getRange(2, 11, lastRow - 1, 1).getValues();
      for (var i = 0; i < leadIds.length; i++) {
        if (leadIds[i][0] === leadId) {
          foundRow = i + 2; // 1-indexed, starting at row 2
          break;
        }
      }
    }

    if (foundRow > 1) {
      // Update existing row in place (prevents ghost/duplicate rows)
      sheet.getRange(foundRow, 1, 1, 11).setValues([rowValues]);
    } else {
      // Insert new row for first step of new session
      sheet.appendRow(rowValues);
    }

    // When customer completes the final step, send email alert to the school
    if (message.indexOf("Step 5 Completed") !== -1 || message.indexOf("Scheduling Assistance") !== -1) {
      try {
        var recipient = "goswimarlsgpra@britishswimschool.com";
        var subject = "🚨 New Swim Scheduling Request: " + (parentName || "New Family");
        var body = "A parent just completed the swim finder on the website!\n\n" +
          "Parent: " + parentName + "\n" +
          "Phone: " + phone + "\n" +
          "Email: " + email + "\n" +
          "SMS Consent: " + smsConsent + "\n\n" +
          "=== INSTANT QUOTE SUMMARY ===\n" +
          "Quoted Ongoing Tuition: " + (quotedTuition || "N/A") + "\n" +
          "Quoted Total Due Today: " + (quotedTotalDue || "N/A") + (quotedRegFee ? " (includes " + quotedRegFee + " annual registration fee)" : "") + "\n\n" +
          "=== SWIMMERS & PREFERRED LESSONS ===\n" +
          (swimmerDetail || "None listed") + "\n\n" +
          "Pool Locations & Preferences: " + (pools || "Any Location") + "\n" +
          "Referral Source: " + (referralSource || "Website") + "\n\n" +
          "Timestamp: " + submittedAt;

        MailApp.sendEmail(recipient, subject, body);
      } catch (mailErr) {
        console.error("Email send failed: " + mailErr);
      }
    }

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: "success", leadId: leadId, row: foundRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    if (lock) lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```
