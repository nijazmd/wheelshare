document.addEventListener('DOMContentLoaded', async () => {
  const vehicleID = getQueryParam('vehicleID');

  const [vehicles, maintenance, documents, serviceIntervals, issues] = await Promise.all([
    fetchVehicleData(),
    fetchMaintenanceData(),
    fetchDocumentsData(),
    fetchServiceIntervals(),
    fetchIssues()
  ]);

  const vehicle = vehicles.find(v => v.vehicleID === vehicleID);
  if (!vehicle) {
    document.getElementById('vehicleTitle').textContent = "Vehicle Not Found";
    return;
  }

  // Title and Registration
  document.getElementById('vehicleTitle').textContent = `${vehicle.make} ${vehicle.vehicleName}`;
  document.getElementById('regNumber').textContent = vehicle.registrationNumber || '—';

  // Image Gallery
  const gallery = document.getElementById('imageGallery');
  for (let i = 1; i <= 5; i++) {
    const img = document.createElement('img');
    img.src = `images/vehicles/${vehicle.vehicleID}/${i}.jpg`;
    img.onerror = () => img.remove();
    gallery.appendChild(img);
  }

  // Odometer
  let odometerValue = vehicle.CurrentOdometer || '';
  if (!odometerValue) {
    const vehicleMaint = maintenance.filter(m => m.vehicleID === vehicleID);
    const latest = vehicleMaint.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    odometerValue = latest?.odometer || '—';
  }
  const paddedOdo = odometerValue.toString().padStart(6, '0');
  document.getElementById('odometerValue').textContent = paddedOdo;

  if (vehicle.OdometerUpdatedDate) {
    document.getElementById('odoDate').textContent = `Odo as on ${vehicle.OdometerUpdatedDate}`;
  }
  

  // Odometer popup
  const odoPopup = document.getElementById('odoPopup');
  const odoInput = document.getElementById('odoInput');
  document.getElementById('odoUpdateBtn').addEventListener('click', () => {
    odoPopup.classList.remove('hidden');
    odoInput.value = odometerValue !== '—' ? odometerValue : '';
  });
  document.getElementById('odoCancelBtn').addEventListener('click', () => {
    odoPopup.classList.add('hidden');
  });

  document.getElementById('odoSaveBtn').addEventListener('click', async () => {
    const newOdo = odoInput.value;
    if (!newOdo || isNaN(newOdo)) {
      alert('Please enter a valid number');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'updateOdometer');
    params.append('vehicleID', vehicleID);
    params.append('odometer', newOdo);
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    params.append('date', todayStr);

    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbyD89HHxv2EIytHw-SkCnSYCK3w07HLQ24anzoUXiJnFE-l5Z05urBByqxV7fL22II5Rg/exec', {
        method: 'POST',
        body: params
      });

      const text = await response.text();
      if (text.includes("updated")) {
        document.getElementById('odometerValue').textContent = newOdo.toString().padStart(6, '0');
        document.getElementById('odoDate').textContent = todayStr; // 👈 add this
        odoPopup.classList.add('hidden');
        odometerValue = newOdo; // update local variable
        renderMaintenanceCards();
        alert('Odometer updated successfully.');
      } else {
        alert('Failed to update odometer: ' + text);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update odometer.');
    }
  });
  
  // Specs
  const specList = document.getElementById('specList');
  const specs = {
    "Category": vehicle.category,
    "Class": vehicle.class,
    "Owners": vehicle.owners,
    "RC Owner": vehicle.rcOwner,
    "Fuel Type": vehicle.fuelType,
    "Turbo": vehicle.turbo,
    "Displacement": vehicle.displacement,
    "Cylinders": vehicle.cylinders,
    "Power": vehicle.power,
    "Torque": vehicle.torque,
    "Gearbox": vehicle.gearbox,
    "Drivetrain": vehicle.drivetrain,
    "Fuel Economy": vehicle.fuelEconomy,
    "Boot Space": vehicle.bootSpace,
    "Colors": vehicle.colors,
    "Seating Capacity": vehicle.seatingCapacity,
    "Registration Year": vehicle.registrationYear,
    "Model Year": vehicle.modelYear
  };
    
  for (const [label, value] of Object.entries(specs)) {
  // Skip specific fields for Motorcycles
  if (
    vehicle.category === "Motorcycle" &&
    (label === "Drivetrain" || label === "Boot Space" || label === "Turbo")
  ) {
    continue;
  }

  let displayValue = value || '—';

  // Append unit for Displacement
  if (label === "Displacement" && value) {
    displayValue += " cc";
  }

  // Append unit for Torque
  if (label === "Torque" && value) {
    displayValue += " Nm";
  }

  // Combine Number of Gears with Gearbox
  if (label === "Gearbox") {
    const gears = vehicle.numberOfGears;
    if (gears) {
      displayValue = `${gears} speed ${value}`;
    }
  }

  const li = document.createElement('li');
  li.innerHTML = `<div class="cardLabel">${label}</div><div class="cardValue">${displayValue}</div>`;
  specList.appendChild(li);
}



  // Maintenance
  const vehicleMaint = maintenance.filter(m => m.vehicleID === vehicleID);
  const intervals = serviceIntervals.filter(i => i.vehicleID === vehicleID);

  function renderMaintenanceCards() {
    const tableBody = document.querySelector('#maintenanceTable tbody');
    tableBody.innerHTML = '';
    const alerts = [];
    const odo = parseInt(odometerValue || '0');
    const today = new Date();

    if (intervals.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="5">No service interval configured.</td>`;
      tableBody.appendChild(row);
      return;
    }

    intervals.forEach(interval => {
      const { component, intervalKM, intervalDays } = interval;
      const history = vehicleMaint
        .filter(m => m.serviceType === component)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const last = history[0];

      let lastDate = last?.date || '—';
      let lastOdo = last?.odometer || '—';
      let lastOdoParsed = last?.odometer ? parseInt(last.odometer) : null;
      let dueKM = lastOdoParsed !== null && !isNaN(intervalKM)
        ? lastOdoParsed + parseInt(intervalKM)
        : '—';

      let dueDate = last?.date
        ? new Date(new Date(last.date).getTime() + intervalDays * 86400000).toLocaleDateString()
        : '—';

      const odoDiff = dueKM !== '—' ? parseInt(dueKM) - odo : null;
      const dueDateObj = last?.date ? new Date(last.date) : null;
      const dateDiff = dueDateObj ? Math.ceil((new Date(dueDateObj.getTime() + intervalDays * 86400000) - today) / 86400000) : null;

      if ((odoDiff !== null && odoDiff <= 0) || (dateDiff !== null && dateDiff <= 0)) {
        alerts.push({ text: `${component} Due`, type: 'maintenance', danger: true });
      } else if ((odoDiff !== null && odoDiff <= 1000) || (dateDiff !== null && dateDiff <= 30)) {
        alerts.push({ text: `${component} Due soon`, type: 'maintenance' });
      }
      


      const tr = document.createElement('tr');

      if ((odoDiff !== null && odoDiff <= 0) || (dateDiff !== null && dateDiff <= 0)) {
        tr.classList.add('danger');
      } else if ((odoDiff !== null && odoDiff <= 1000) || (dateDiff !== null && dateDiff <= 30)) {
        tr.classList.add('warning');
      }

      tr.innerHTML = `
        <td>${component}</td>
        <td>${lastDate} <br> ${lastOdo}</td>
        <td>${dueDate}<br>${dueKM}</td>
      `;
      tableBody.appendChild(tr);
    });

// Combine document alerts with maintenance alerts
    const docRecords = documents.filter(d => d.vehicleID === vehicleID);
    docRecords.forEach(doc => {
      const expiry = new Date(doc.expiryDate);
      const remainingDays = Math.ceil((expiry - today) / 86400000);
      if (remainingDays <= 0) {
        alerts.push({ text: `${doc.documentType} expired`, type: 'document', danger: true });
      } else if (remainingDays <= 30) {
        alerts.push({ text: `${doc.documentType} expiring in ${remainingDays} days`, type: 'document' });
      }
    });

    // Optionally sort alerts
    function priority(alert) {
      if (alert.danger) return 1;
      if (alert.text.includes('Due')) return 2;
      return 3;
    }
    alerts.sort((a, b) => priority(a) - priority(b));
    

    const alertBox = document.querySelector('.alertBox');
    const gallery = document.getElementById('imageGallery');

    if (alerts.length) {
      const html = alerts.map(a => {
        const icon = a.type === 'document' ? 'doc.svg' : 'maintenance.svg';
        const dangerClass = a.danger ? 'danger' : '';
        return `<div class="alertItem ${dangerClass}"><img src="images/icons/${icon}" alt="">&nbsp; ${a.text}</div>`;
      }).join('');

      if (!alertBox) {
        const newAlert = document.createElement('div');
        newAlert.className = 'alertBox';
        newAlert.innerHTML = html;
        gallery.insertAdjacentElement('afterend', newAlert);
      } else {
        alertBox.innerHTML = html;
      }
    }
  }

  renderIssueReports();
  function renderIssueReports() {
    const issueList = document.getElementById('issueList');
    const reports = issues.filter(i => i.vehicleID === vehicleID);
    if (reports.length === 0) {
      issueList.innerHTML = '<li>No issues reported.</li>';
      return;
    }
    reports.sort((a, b) => new Date(b.date) - new Date(a.date));
    reports.forEach(r => {
      const li = document.createElement('li');
    
      li.innerHTML = `<div class="issueLabel">on ${r.date} ${r.reporter ? `by ${r.reporter}` : ''}</div>${r.issue}`;
      issueList.appendChild(li);
    });    
  }

  renderMaintenanceCards();
  renderMaintenanceHistory();

  function renderMaintenanceHistory() {
    const tableBody = document.querySelector('#maintenanceHistoryTable tbody');
    tableBody.innerHTML = '';
    const grouped = {};

    vehicleMaint.forEach(entry => {
      const odo = entry.odometer || '—';
      if (!grouped[odo]) grouped[odo] = { date: entry.date, cost: 0 };
      grouped[odo].cost += parseFloat(entry.cost || 0);
    });

    Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a)).forEach(odo => {
      const { date, cost } = grouped[odo];
      const row = document.createElement('tr');
      row.innerHTML = `<td>${odo} km</td><td>${date}</td><td>₹ ${cost.toLocaleString()}</td>`;
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        window.location.href = `maintenance-detail.html?vehicleID=${vehicleID}&odo=${odo}`;
      });
      tableBody.appendChild(row);
    });
  }

  // Documents
  const documentList = document.getElementById('documentList');
  const docRecords = documents.filter(d => d.vehicleID === vehicleID);
  if (docRecords.length === 0) {
    documentList.innerHTML = '<li>No documents found.</li>';
  } else {
    const today = new Date();
    docRecords.forEach(doc => {
      const expiry = new Date(doc.expiryDate);
      const remainingDays = Math.ceil((expiry - today) / 86400000);
      const li = document.createElement('li');
    
      // ✅ Apply warning or danger classes
      if (remainingDays <= 0) {
        li.classList.add('danger');
      } else if (remainingDays <= 30) {
        li.classList.add('warning');
      }
    
      li.innerHTML = `
        <div class="docLabel">${doc.documentType}</div>
        <div class="docExpiry">
          <div class="docInfo">
            <div class="row">
              <span class="issueLabel">Expiry: &nbsp;</span> 
              <span class="docDate">${doc.expiryDate}</span> 
            </div>
            <div class="row">
              <span class="issueLabel">Remaining: &nbsp;</span> 
              <span class="remaining">(${remainingDays} days)</span>
            </div>
            <div class="row">
              <span class="issueLabel">File: </span> 
              <span> ${doc.fileLink ? `<a href="${doc.fileLink}" target="_blank">View</a><br>` : ''}</span>
            </div>
            <div class="row">
              <span class="issueLabel">Notes: &nbsp;</span> 
              <span>${doc.notes ? `${doc.notes}` : ''}</span>
            </div>
          </div>
        </div>`;
      documentList.appendChild(li);
    });    
  }
});

async function fetchServiceIntervals() {
  return await fetchSheetData('ServiceIntervals');
}
