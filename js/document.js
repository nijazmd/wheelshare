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


  const form = document.getElementById('documentForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const loader = document.getElementById('loaderOverlay');
    loader.classList.remove('hidden');

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const params = new URLSearchParams();
    params.append('type', 'document');
    params.append('vehicleID', vehicleSelect.value);
    params.append('documentType', document.getElementById('docType').value);
    params.append('issueDate', document.getElementById('docIssueDate').value);
    params.append('expiryDate', document.getElementById('docExpiryDate').value);
    // params.append('fileLink', document.getElementById('docFileLink').value);
    params.append('notes', document.getElementById('docNotes').value);

    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: params
      });

      alert('Document submitted successfully.');
      form.reset();

      // Re-apply today's date after reset
      issueDateInput.value = new Date().toISOString().split('T')[0];
      expiryDateInput.value = '';
    } catch (err) {
      alert('Failed to submit document.');
      console.error(err);
    } finally {
      loader.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });

  const issueDateInput = document.getElementById('docIssueDate');
  const expiryDateInput = document.getElementById('docExpiryDate');
  const docTypeSelect = document.getElementById('docType');

  // Set today's date as default for Issue Date
  const todayStr = new Date().toISOString().split('T')[0];
  issueDateInput.value = todayStr;

  // Auto-predict Expiry Date
  function updateExpiryPrediction() {
    const type = docTypeSelect.value;
    const issueVal = issueDateInput.value;
  
    if (!issueVal) return;
  
    const issueDate = new Date(issueVal);
    if (isNaN(issueDate)) return;
  
    if (type === 'Insurance') {
      issueDate.setFullYear(issueDate.getFullYear() + 1);
      issueDate.setDate(issueDate.getDate() - 1); // subtract 1 day
    } else if (type === 'PUC') {
      issueDate.setMonth(issueDate.getMonth() + 6);
      issueDate.setDate(issueDate.getDate() - 1); // subtract 1 day
    } else {
      return;
    }
  
    expiryDateInput.value = issueDate.toISOString().split('T')[0];
  }
  

  docTypeSelect.addEventListener('change', updateExpiryPrediction);
  issueDateInput.addEventListener('change', updateExpiryPrediction);
});
