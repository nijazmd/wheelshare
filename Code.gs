const SHEET_MAINTENANCE = 'Maintenance';
const SHEET_DOCUMENTS = 'Documents';

function doPost(e) {
  const params = e.parameter;
  const type = params.type;

  if (type === 'maintenance') {
    return handleMaintenanceSubmission(params);
  } else if (type === 'document') {
    return handleDocumentSubmission(params);
  } else if (type === 'updateOdometer') {
    return updateCurrentOdometer(params.vehicleID, params.odometer);
  } else if (type === 'issue') {
    return handleIssueReport(params);
  }

  return ContentService.createTextOutput('Invalid submission type');
}

// ✅ Submit maintenance entry
function handleMaintenanceSubmission(entry) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Append to Maintenance sheet
  const sheet = ss.getSheetByName(SHEET_MAINTENANCE);
  sheet.appendRow([
    entry.vehicleID,
    entry.date,
    entry.odometer,
    entry.serviceType,
    entry.action,
    entry.cost,
    entry.notes,
    entry.workshop || ""
  ]);

  // 2. Compare with current odometer and update if needed
  const vehicleSheet = ss.getSheetByName('Vehicles');
  const vehicleData = vehicleSheet.getDataRange().getValues();
  const headers = vehicleData[0];
  const idCol = headers.indexOf('vehicleID');
  const odoCol = headers.indexOf('CurrentOdometer');
  const dateCol = headers.indexOf('OdometerUpdatedDate'); // Ensure this column exists

  if (idCol === -1 || odoCol === -1 || dateCol === -1) {
    return ContentService.createTextOutput("Column not found").setMimeType(ContentService.MimeType.TEXT);
  }

  for (let i = 1; i < vehicleData.length; i++) {
    if (String(vehicleData[i][idCol]) === String(entry.vehicleID)) {
      const currentOdo = parseInt(vehicleData[i][odoCol]) || 0;
      const newOdo = parseInt(entry.odometer) || 0;

      if (newOdo > currentOdo) {
        vehicleSheet.getRange(i + 1, odoCol + 1).setValue(newOdo);
        vehicleSheet.getRange(i + 1, dateCol + 1).setValue(new Date());
      }
      break;
    }
  }

  return ContentService.createTextOutput('Maintenance entry added').setMimeType(ContentService.MimeType.TEXT);
}


// ✅ Submit document entry
function handleDocumentSubmission(entry) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DOCUMENTS);
  sheet.appendRow([
    entry.vehicleID,
    entry.documentType,
    entry.issueDate,
    entry.expiryDate,
    entry.fileLink,
    entry.notes
  ]);
  return ContentService.createTextOutput('Document entry added');
}

// ✅ Submit issue report
function handleIssueReport(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('IssueReports');
  sheet.appendRow([
    params.vehicleID,
    params.date,
    params.reporter || '',
    params.issue
  ]);
  return ContentService.createTextOutput("Issue submitted").setMimeType(ContentService.MimeType.TEXT);
}

// ✅ Update odometer in Vehicles sheet
function updateCurrentOdometer(vehicleID, odometer) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Vehicles');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('vehicleID');
  const odoCol = headers.indexOf('CurrentOdometer');
  const dateCol = headers.indexOf('OdometerUpdatedDate'); // ✅ Add this column in your sheet

  if (idCol === -1 || odoCol === -1 || dateCol === -1) {
    return ContentService.createTextOutput("Column not found").setMimeType(ContentService.MimeType.TEXT);
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(vehicleID)) {
      sheet.getRange(i + 1, odoCol + 1).setValue(odometer);
      sheet.getRange(i + 1, dateCol + 1).setValue(new Date()); // ✅ store current date/time
      return ContentService.createTextOutput("Odometer updated").setMimeType(ContentService.MimeType.TEXT);
    }
  }

  return ContentService.createTextOutput("Vehicle ID not found").setMimeType(ContentService.MimeType.TEXT);
}
