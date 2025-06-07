// Replace with your actual Spreadsheet ID and API Key
const spreadsheetId = '11j07orlLjcmfstb5db146z95cW_EZ6tsgsAlFeyq8Ho';
const apiKey = 'AIzaSyCF9f76dCJ8GnXLR2Leq-gPkppeelcRSwI';
const sheetName = 'Vehicles'; // Change if your sheet has a different name

// Construct the URL for the Google Sheets API
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;

// Function to fetch and display data
async function fetchGoogleSheetData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    const rows = data.values;

    // Assuming the first row contains headers
    const headers = rows[0];
    const entries = rows.slice(1);

    const vehicleList = document.getElementById('vehicleList');
    vehicleList.innerHTML = ''; // Clear existing content

    entries.forEach(row => {
      const vehicle = {};
      headers.forEach((header, index) => {
        vehicle[header] = row[index];
      });

      const card = document.createElement('div');
      card.className = 'vehicleCard';

      card.innerHTML = `
        <img src="images/vehicles/${vehicle.vehicleID}/thumb.jpg" alt="${vehicle.make} ${vehicle.vehicleName}">
        <h2>${vehicle.make} ${vehicle.vehicleName}</h2>
        <p>Model Year: ${vehicle.modelYear}</p>
        <p>Registration Year: ${vehicle.registrationYear}</p>
        <p>Category: ${vehicle.category}</p>
        <p>Class: ${vehicle.class}</p>
      `;

      vehicleList.appendChild(card);
    });
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
  }
}

// Call the function when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', fetchGoogleSheetData);
