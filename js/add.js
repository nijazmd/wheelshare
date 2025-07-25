const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyD89HHxv2EIytHw-SkCnSYCK3w07HLQ24anzoUXiJnFE-l5Z05urBByqxV7fL22II5Rg/exec';

document.addEventListener('DOMContentLoaded', async () => {
  const vehicleSelect = document.getElementById('vehicleSelect');
  const vehicles = await fetchVehicleData();

  vehicles
  .sort((a, b) => {
    const nameA = `${a.make} ${a.vehicleName}`.toLowerCase();
    const nameB = `${b.make} ${b.vehicleName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  })
  .forEach(v => {
    const option = document.createElement('option');
    option.value = v.vehicleID;
    option.textContent = `${v.make} ${v.vehicleName}`;
    vehicleSelect.appendChild(option);
  });

  const serviceIntervals = await fetchServiceIntervals();

// When vehicle is selected, update the serviceSuggestions datalist
vehicleSelect.addEventListener('change', () => {
  const selectedID = vehicleSelect.value;
  const vehicleComponents = serviceIntervals
    .filter(item => item.vehicleID === selectedID)
    .map(item => item.component);

  populateServiceSuggestions(vehicleComponents);
});

// Trigger once on page load if vehicle is preselected
if (vehicleSelect.value) {
  const vehicleComponents = serviceIntervals
    .filter(item => item.vehicleID === vehicleSelect.value)
    .map(item => item.component);

  populateServiceSuggestions(vehicleComponents);
}


  const formMaintenance = document.getElementById('maintenanceForm');
  const serviceItemsContainer = document.getElementById('serviceItemsContainer');
  const addServiceItemBtn = document.getElementById('addServiceItemBtn');

  function addServiceItemRow() {
    const uniqueID = Date.now(); // generate once
    const row = document.createElement('div');
    row.className = 'serviceItemRow';
    row.innerHTML = `
      <label>Service Item:
        <input list="serviceSuggestions" class="serviceType" required />
      </label>
      <label>Action:</label>
      <div class="actionGroup">
        <input id="replaced_${uniqueID}" type="radio" name="action_${uniqueID}" value="Replaced" required />
        <label for="replaced_${uniqueID}">Replaced</label>
        <input id="checked_${uniqueID}" type="radio" name="action_${uniqueID}" value="Checked" />
        <label for="checked_${uniqueID}">Checked</label>
        <input id="serviced_${uniqueID}" type="radio" name="action_${uniqueID}" value="Serviced" />
        <label for="serviced_${uniqueID}">Serviced</label>
      </div>    
      <label>Cost:
        <input type="number" class="cost" />
      </label>
      <label>Notes:
        <input type="text" class="notes" />
      </label>
    `;
    serviceItemsContainer.appendChild(row);
    row.querySelector('.cost').addEventListener('input', updateTotalCost);
  }
  

  function updateTotalCost() {
    const costInputs = document.querySelectorAll('.serviceItemRow .cost');
    const otherCost = parseFloat(document.getElementById('otherCost').value) || 0;
  
    let sum = 0;
    costInputs.forEach(input => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) sum += val;
    });
  
    const total = sum + otherCost;
    document.getElementById('totalServiceCost').value = total;
  }
  
  function updateTotalCost() {
    const costInputs = document.querySelectorAll('.serviceItemRow .cost');
    const otherCost = parseFloat(document.getElementById('otherCost').value) || 0;
    const labourCost = parseFloat(document.getElementById('labourCharges').value) || 0;
  
    let sum = 0;
    costInputs.forEach(input => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) sum += val;
    });
  
    const total = sum + otherCost + labourCost;
    document.getElementById('totalServiceCost').value = total;
  }

  function adjustOtherCostFromTotal() {
    const totalInput = document.getElementById('totalServiceCost');
    const otherInput = document.getElementById('otherCost');
    const labour = parseFloat(document.getElementById('labourCharges').value) || 0;
    const costInputs = document.querySelectorAll('.serviceItemRow .cost');
  
    let sum = labour;
    costInputs.forEach(input => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) sum += val;
    });
  
    const totalEntered = parseFloat(totalInput.value);
    const calculatedOther = totalEntered - sum;
  
    if (!isNaN(calculatedOther)) {
      otherInput.value = calculatedOther;
  
      // Highlight if Other is negative
      if (calculatedOther < 0) {
        totalInput.classList.add('error');
      } else {
        totalInput.classList.remove('error');
      }
    }
  }
  
  
  addServiceItemBtn.addEventListener('click', addServiceItemRow);
  addServiceItemRow(); // initial row

  document.getElementById('otherCost').addEventListener('input', updateTotalCost);
  document.getElementById('labourCharges').addEventListener('input', updateTotalCost);
document.getElementById('totalServiceCost').addEventListener('input', adjustOtherCostFromTotal);
document.getElementById('totalServiceCost').addEventListener('blur', adjustOtherCostFromTotal);




  formMaintenance.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const loader = document.getElementById('loaderOverlay');
    loader.classList.remove('hidden');
  
    const submitBtn = formMaintenance.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
  
    const labour = document.getElementById('labourCharges').value || "";
  
    const vehicleID = vehicleSelect.value;
    const date = document.getElementById('maintDate').value;
    const odometer = document.getElementById('maintOdometer').value;
    const rows = serviceItemsContainer.querySelectorAll('.serviceItemRow');
    const workshop = document.getElementById('workshopName').value || "";
  
    let allSuccess = true;
  
    for (const row of rows) {
      const serviceType = row.querySelector('.serviceType')?.value || "";
      const action = row.querySelector('input[name^="action_"]:checked')?.value || "";
      const cost = row.querySelector('.cost')?.value || "";
      const notes = row.querySelector('.notes')?.value || "";
  
      const params = new URLSearchParams();
      params.append('type', 'maintenance');
      params.append('vehicleID', vehicleID);
      params.append('date', date);
      params.append('odometer', odometer);
      params.append('workshop', workshop);
      params.append('serviceType', serviceType);
      params.append('action', action);
      params.append('cost', cost);
      params.append('notes', notes);
      params.append('labourCharges', labour);
  
      try {
        await fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: params
        });
      } catch (err) {
        console.error('Submit failed for one item:', err);
        allSuccess = false;
      }
    }

    if (labour) {
      const params = new URLSearchParams();
      params.append('type', 'maintenance');
      params.append('vehicleID', vehicleID);
      params.append('date', date);
      params.append('odometer', odometer);
      params.append('serviceType', 'Labour Charges');
      params.append('action', '');
      params.append('cost', labour);
      params.append('notes', '');
      params.append('workshop', document.getElementById('workshopName').value || '');
    
      try {
        await fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: params
        });
      } catch (err) {
        console.error('Labour entry failed:', err);
        allSuccess = false;
      }
    }
    
  
    loader.classList.add('hidden');
    submitBtn.disabled = false;
  
    if (allSuccess) {
      alert('Maintenance entries submitted successfully.');
    } else {
      alert('Some entries may have failed to submit.');
    }
  
    formMaintenance.reset();
    serviceItemsContainer.innerHTML = '';
    addServiceItemRow(); // add a fresh row
  }); 
  
});
async function fetchServiceIntervals() {
return await fetchSheetData('ServiceIntervals');
}

function populateServiceSuggestions(components) {
const datalist = document.getElementById('serviceSuggestions');
datalist.innerHTML = ''; // Clear existing options

const unique = [...new Set(components.filter(Boolean))].sort();
unique.forEach(component => {
  const opt = document.createElement('option');
  opt.value = component;
  datalist.appendChild(opt);
});

document.getElementById('otherCost').value = 0;
document.getElementById('totalServiceCost').value = 0;

}
