document.addEventListener('DOMContentLoaded', async () => {
  const vehicleSelect = document.getElementById('vehicleSelect');
  const dateInput = document.getElementById('reportDate');
  const form = document.getElementById('issueForm');

  // Set today's date
  dateInput.value = new Date().toISOString().split('T')[0];

  const vehicles = await fetchVehicleData();
  vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.vehicleID;
    opt.textContent = `${v.make} ${v.vehicleName}`;
    vehicleSelect.appendChild(opt);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const loader = document.getElementById('loaderOverlay');
    loader.classList.remove('hidden');
  
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
  
    const params = new URLSearchParams();
    params.append('type', 'issue');
    params.append('vehicleID', vehicleSelect.value);
    params.append('date', dateInput.value);
    params.append('reporter', document.getElementById('reporterName').value.trim());
    params.append('issue', document.getElementById('issueText').value.trim());
  
    try {
      await fetch('https://script.google.com/macros/s/AKfycbyD89HHxv2EIytHw-SkCnSYCK3w07HLQ24anzoUXiJnFE-l5Z05urBByqxV7fL22II5Rg/exec', {
        method: 'POST',
        mode: 'no-cors',
        body: params
      });
  
      alert('Issue submitted!');
      form.reset();
      dateInput.value = new Date().toISOString().split('T')[0];
    } catch (err) {
      alert('Failed to submit issue.');
      console.error(err);
    } finally {
      loader.classList.add('hidden');
      submitBtn.disabled = false;
    }
  });
  
});
