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
    "Best Fuel Economy": vehicle.fuelEconomy,
    "Boot Space": vehicle.bootSpace,
    "Colors": vehicle.colors,
    "Seating Capacity": vehicle.seatingCapacity,
    "Model Year": vehicle.modelYear,
    "Facelift": vehicle.faceliftYear,
    "Registration Year": vehicle.registrationYear,
    "Owning Date": vehicle.owningDate
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

  // Append units
  if (label === "Displacement" && value) {
    displayValue += " cc";
  }

  if (label === "Power" && value) {
    displayValue += " bhp";
  }

  if (label === "Torque" && value) {
    displayValue += " Nm";
  }

  if (label === "Best Fuel Economy" && value) {
    displayValue += "  kmpl";
  }

  if (label === "Boot Space" && value) {
    displayValue += " l";
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
  
    intervals.sort((a, b) => {
      const getUrgencyScore = (interval) => {
        const history = vehicleMaint
          .filter(m => m.serviceType === interval.component)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        const last = history[0];
        const odoDiff = last?.odometer ? parseInt(last.odometer) + parseInt(interval.replaceKM || 0) - parseInt(odometerValue) : Infinity;
        const dateDiff = last?.date ? new Date(new Date(last.date).getTime() + interval.intervalDays * 86400000) - new Date() : Infinity;
        return Math.min(odoDiff, dateDiff); // Smaller = more urgent
      };
      return getUrgencyScore(a) - getUrgencyScore(b);
    });
    
    intervals.forEach(interval => {
      const { component, replaceKM, intervalDays } = interval;
      const history = vehicleMaint
        .filter(m => m.serviceType === component)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const last = history[0];
  
      const lastDate = formatDate(last?.date);
      const lastOdo = last?.odometer ? `${last.odometer} km` : '—';
      const lastOdoParsed = last?.odometer ? parseInt(last.odometer) : null;
      const lastAction = last?.action?.toLowerCase() || '';
      const isChecked = lastAction === 'checked';
  
      const replaceDueKM = (lastOdoParsed !== null && replaceKM) ? lastOdoParsed + parseInt(replaceKM) : null;
      const inspectDueKM = (lastOdoParsed !== null && interval.inspectionKM) ? lastOdoParsed + parseInt(interval.inspectionKM) : null;
      
      let dueKM = '—';
      let serviceType = '';
      if (replaceDueKM !== null && inspectDueKM !== null) {
        if (replaceDueKM <= inspectDueKM) {
          dueKM = replaceDueKM;
          serviceType = 'Replace';
        } else {
          dueKM = inspectDueKM;
          serviceType = 'Check';
        }
      } else if (replaceDueKM !== null) {
        dueKM = replaceDueKM;
        serviceType = 'Replace';
      } else if (inspectDueKM !== null) {
        dueKM = inspectDueKM;
        serviceType = 'Check';
      } else {
        serviceType = '—';
      }
      
  
      const dueDate = formatDate(
        last?.date ? new Date(new Date(last.date).getTime() + intervalDays * 86400000) : null
      );
      
  
      const odoDiff = dueKM !== '—' ? parseInt(dueKM) - odo : null;
      const dueDateObj = last?.date ? new Date(last.date) : null;
      const dateDiff = dueDateObj
        ? Math.ceil((new Date(dueDateObj.getTime() + intervalDays * 86400000) - today) / 86400000)
        : null;
  
      const isOverdue = (odoDiff !== null && odoDiff <= 0) || (dateDiff !== null && dateDiff <= 0);
      const isUpcoming = (odoDiff !== null && odoDiff <= 1000) || (dateDiff !== null && dateDiff <= 30);
  
      if (isOverdue) {
        alerts.push({ text: `${component} Due`, type: 'maintenance', danger: true });
      } else if (isUpcoming) {
        alerts.push({ text: `${component} Due soon`, type: 'maintenance' });
      }
  
      const tr = document.createElement('tr');
      if (isOverdue) tr.classList.add('danger');
      else if (isUpcoming) tr.classList.add('warning');
  
      let nextServiceHTML = '—';
      if (dueKM !== '—' && dueDate !== '—' && serviceType !== '—') {
        nextServiceHTML = `
          ${serviceType} by ${dueKM.toLocaleString()} km<br>
          on ${dueDate}
        `;
      }
      
      tr.innerHTML = `
        <td>${component}</td>
        <td>${lastDate}<br>${lastOdo}</td>
        <td>${nextServiceHTML}</td>
      `;
      
      tableBody.appendChild(tr);
    });
  
    // Document alerts – only latest per type
    const allDocs = documents.filter(d => d.vehicleID === vehicleID);
    const latestDocsMap = {};
    allDocs.forEach(doc => {
      const type = doc.documentType;
      const expiryDate = new Date(doc.expiryDate);
      if (!latestDocsMap[type] || expiryDate > new Date(latestDocsMap[type].expiryDate)) {
        latestDocsMap[type] = doc;
      }
    });
    const docRecords = Object.values(latestDocsMap);

    docRecords.forEach(doc => {
      const expiry = new Date(doc.expiryDate);
      const remainingDays = Math.ceil((expiry - today) / 86400000);
      const docType = doc.documentType?.toLowerCase();

      if (remainingDays <= 0) {
        alerts.push({ text: `${doc.documentType} expired`, type: 'document', danger: true });
      } else {
        const threshold = docType === 'rc' || docType === 'registration' ? 90 : 30;
        if (remainingDays <= threshold) {
          alerts.push({ text: `${doc.documentType} expiring in ${remainingDays} days`, type: 'document' });
        }
      }
    });

  
    // Sort alerts: danger > upcoming > others
    alerts.sort((a, b) => {
      if (a.danger && !b.danger) return -1;
      if (!a.danger && b.danger) return 1;
      return 0;
    });
  
    const alertBox = document.querySelector('.alertBox');
    const gallery = document.getElementById('imageGallery');
  
    if (alerts.length) {
      const html = alerts.map(a => {
        const icon = a.type === 'document' ? 'doc.svg' : 'maintenance.svg';
        const dangerClass = a.danger ? 'danger' : '';
        return `<div class="alertItem ${dangerClass}" data-type="${a.type}">
                  <img src="images/icons/${icon}" alt="">&nbsp; ${a.text}
                </div>`;
      }).join('');
  
      if (!alertBox) {
        const newAlert = document.createElement('div');
        newAlert.className = 'alertBox';
        newAlert.innerHTML = html;
        gallery.insertAdjacentElement('afterend', newAlert);
      } else {
        alertBox.innerHTML = html;
      }
  
      // Add click scroll behavior
      document.querySelectorAll('.alertItem').forEach(item => {
        item.addEventListener('click', () => {
          const targetID = item.dataset.type === 'document' ? '#docsTab' : '#maintTab';
          const target = document.querySelector(targetID);
      
          if (!target) return;
      
          // Get Y offset relative to full page
          const yOffset = -70; // Adjust based on your sticky header height
          const y = target.getBoundingClientRect().top + window.scrollY + yOffset;
      
          window.scrollTo({
            top: y,
            behavior: 'smooth'
          });
        });
      });       
    }
  }  

  renderIssueReports();
  function renderIssueReports() {
    const issueList = document.getElementById('issueList');
    const reports = issues
      .filter(i => i.vehicleID === vehicleID && i.isFixed !== 'TRUE') // ✅ only show open issues
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  
    if (reports.length === 0) {
      issueList.innerHTML = '<li>No issues reported.</li>';
      return;
    }
  
    issueList.innerHTML = ''; // clear list first
  
    reports.forEach(r => {
      const li = document.createElement('li');
      li.classList.add('issueCard'); // optional for styling
  
      const meta = `<div class="issueLabel">on ${r.date} ${r.reporter ? `by ${r.reporter}` : ''}</div>`;
      const content = `<div class="issueContent">${r.issue}</div>`;
      const btn = `<button class="nakedBtn markFixedBtn">Mark as Complete</button>`;
  
      li.innerHTML = meta + content + btn;
  
      const button = li.querySelector('.markFixedBtn');
      button.addEventListener('click', async () => {
        const confirmed = confirm("Are you sure you want to mark this issue as complete?");
        if (!confirmed) return;
      
        button.disabled = true;
        button.textContent = 'Updating...';
  
        const params = new URLSearchParams();
        params.append('type', 'fixIssue');
        params.append('vehicleID', vehicleID);
        params.append('issue', r.issue);
  
        try {
          const res = await fetch(
            'https://script.google.com/macros/s/AKfycbyD89HHxv2EIytHw-SkCnSYCK3w07HLQ24anzoUXiJnFE-l5Z05urBByqxV7fL22II5Rg/exec',
            { method: 'POST', body: params }
          );
          const text = await res.text();
  
          if (text.includes('fixed')) {
            li.remove(); // remove the card
            if (issueList.children.length === 0) {
              issueList.innerHTML = '<li>No issues reported.</li>';
            }
          } else {
            alert('Failed to mark as complete: ' + text);
            button.disabled = false;
            button.textContent = 'Mark as Complete';
          }
        } catch (err) {
          alert('Error connecting to server.');
          button.disabled = false;
          button.textContent = 'Mark as Complete';
        }
      });
  
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
  const rawDocs = documents.filter(d => d.vehicleID === vehicleID);

  // ✅ Keep only the latest document per documentType
  const latestDocsMap = {};
  rawDocs.forEach(doc => {
    const type = doc.documentType;
    const expiryDate = new Date(doc.expiryDate);
    if (!latestDocsMap[type] || expiryDate > new Date(latestDocsMap[type].expiryDate)) {
      latestDocsMap[type] = doc;
    }
  });
  
  const docRecords = Object.values(latestDocsMap);
  
  if (docRecords.length === 0) {
    documentList.innerHTML = '<li>No documents found.</li>';
  } else {
    const today = new Date();
    docRecords.forEach(doc => {
      const expiry = new Date(doc.expiryDate);
      const remainingDays = Math.ceil((expiry - today) / 86400000);
      const formattedRemaining = formatRemainingTime(remainingDays);
      const li = document.createElement('li');
  
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
              <span class="remaining">(${formattedRemaining})</span>
            </div>
            <div class="row">
              <span class="issueLabel">File: &nbsp;</span> 
                <span>
                ${
                  doc.fileLink
                    ? `<a href="docs/${vehicleID}/${doc.fileLink}" target="_blank">${
                        doc.fileLink.toLowerCase().endsWith('.jpg') || doc.fileLink.toLowerCase().endsWith('.jpeg')
                          ? 'View Image'
                          : 'Open Document'
                      }</a>`
                    : 'Document not uploaded'
                }
                
              </span>
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

function formatRemainingTime(days) {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remaining = days - years * 365 - months * 30;

  const parts = [];
  if (years) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (remaining) parts.push(`${remaining} day${remaining > 1 ? 's' : ''}`);

  return parts.length ? parts.join(', ') : 'Today';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
