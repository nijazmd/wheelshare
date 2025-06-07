// data-fetch.js

const spreadsheetId = '11j07orlLjcmfstb5db146z95cW_EZ6tsgsAlFeyq8Ho';
const apiKey = 'AIzaSyCF9f76dCJ8GnXLR2Leq-gPkppeelcRSwI';
const sheetName = 'Vehicles'; // Ensure this matches your sheet name

// Utility to fetch and format sheet data
async function fetchSheetData(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.values || data.values.length === 0) return [];

    const headers = data.values[0];
    const entries = data.values.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = i < row.length ? row[i] : '';
      });
      return obj;
    });
    return entries;
  } catch (err) {
    console.error(`Error fetching ${sheetName}:`, err);
    return [];
  }
}

// Public functions to fetch each dataset
async function fetchVehicleData() {
  return await fetchSheetData('Vehicles');
}

async function fetchMaintenanceData() {
  return await fetchSheetData('Maintenance');
}

async function fetchDocumentsData() {
  return await fetchSheetData('Documents');
}
async function fetchServiceIntervals() {
  return await fetchSheetData('ServiceIntervals');
}
async function fetchIssues() {
  return await fetchSheetData('IssueReports');
}
