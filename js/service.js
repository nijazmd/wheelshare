document.addEventListener('DOMContentLoaded', async () => {
  const [vehicles, maintenance, intervals] = await Promise.all([
    fetchVehicleData(),
    fetchMaintenanceData(),
    fetchServiceIntervals()
  ]);

  const tableBody = document.getElementById('serviceTableBody');
  const today = new Date();

  vehicles.forEach(vehicle => {
    const vehicleID = vehicle.vehicleID;
    const currentOdo = parseInt(vehicle.CurrentOdometer || '0');
    const vehicleName = `${vehicle.make} ${vehicle.vehicleName}`;
    const vehicleMaint = maintenance.filter(m => m.vehicleID === vehicleID);
    const vehicleIntervals = intervals.filter(i => i.vehicleID === vehicleID);

    let dueItems = [];

    vehicleIntervals.forEach(interval => {
      const { component, replaceKM, inspectionKM, intervalDays } = interval;
      const history = vehicleMaint
        .filter(m => m.serviceType === component)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      const last = history[0];
    
      const lastDate = last?.date || '—';
      const lastOdo = last?.odometer && !isNaN(parseInt(last.odometer)) ? parseInt(last.odometer) : null;
    
      // Dates
      const dueDate = last?.date
        ? new Date(new Date(last.date).getTime() + intervalDays * 86400000)
        : null;
      const remainingDays = dueDate ? Math.ceil((dueDate - today) / 86400000) : null;
    
      // Replacement KM
      const parsedReplaceKM = !isNaN(parseInt(replaceKM)) ? parseInt(replaceKM) : null;

      const dueReplaceKM = lastOdo !== null && !isNaN(parsedReplaceKM) ? lastOdo + parsedReplaceKM : null;
      const remainingReplaceKM = dueReplaceKM !== null ? dueReplaceKM - currentOdo : null;
    
      // Inspection KM
      const parsedInspectKM = !isNaN(parseInt(inspectionKM)) ? parseInt(inspectionKM) : null;

      const dueInspectKM = lastOdo !== null && !isNaN(parsedInspectKM) ? lastOdo + parsedInspectKM : null;
      const remainingInspectKM = dueInspectKM !== null ? dueInspectKM - currentOdo : null;
    
      // Push both if valid
      if (dueReplaceKM !== null || dueDate) {
        dueItems.push({
          component: `${component} (Replace)`,
          lastDate,
          lastOdo,
          dueKM: dueReplaceKM,
          dueDate,
          remainingKM: remainingReplaceKM,
          remainingDays
        });
      }
    
      if (dueInspectKM !== null || dueDate) {
        dueItems.push({
          component: `${component} (Inspect)`,
          lastDate,
          lastOdo,
          dueKM: dueInspectKM,
          dueDate,
          remainingKM: remainingInspectKM,
          remainingDays
        });
      }
    });
    

    if (dueItems.length === 0) return;

    // Find the most urgent part
    dueItems.sort((a, b) => {
      const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
      const kmDiff = a.dueKM - b.dueKM;
      return dateDiff !== 0 ? dateDiff : kmDiff;
    });

    const earliest = dueItems[0];

    // Determine urgency class
    let statusClass = 'due-normal';
    if ((earliest.remainingKM <= 500 || earliest.remainingDays <= 30)) {
      statusClass = 'due-orange';
    }
    if (earliest.remainingKM <= 0 || earliest.remainingDays <= 0) {
      statusClass = 'due-red';
    }

    const mainRow = document.createElement('tr');
    mainRow.classList.add(statusClass);
    mainRow.innerHTML = `
      <td>${vehicleName}</td>
      <td>${currentOdo}</td>
      <td>${earliest.dueDate.toLocaleDateString()}<br>${earliest.dueKM} km</td>
      <td>${earliest.remainingDays} days / ${earliest.remainingKM} km</td>
    `;

    const detailRow = document.createElement('tr');
    detailRow.className = 'detailsRow';
    const td = document.createElement('td');
    td.colSpan = 4;

    const list = document.createElement('ul');
    dueItems.forEach(item => {
      const li = document.createElement('li');
      const overdue = item.remainingKM <= 0 || item.remainingDays <= 0;
      const dueSoon = item.remainingKM <= 500 || item.remainingDays <= 30;

      if (dueSoon || overdue) {
        li.textContent = `${item.component} — due on ${item.dueDate.toLocaleDateString()} or ${item.dueKM} km`;
        list.appendChild(li);
      }
    });

    if (list.children.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No urgent components due.';
      list.appendChild(li);
    }

    td.appendChild(list);
    detailRow.appendChild(td);
    detailRow.style.display = 'none';

    mainRow.addEventListener('click', () => {
      detailRow.style.display = detailRow.style.display === 'none' ? 'table-row' : 'none';
    });

    tableBody.appendChild(mainRow);
    tableBody.appendChild(detailRow);
  });

 // 🔽 Expiring Documents Section
(async () => {
  const documents = await fetchDocumentsData();
  const today = new Date();
  const docTableBody = document.getElementById('documentTableBody');

  vehicles.forEach(vehicle => {
    const vehicleID = vehicle.vehicleID;
    const vehicleName = `${vehicle.make} ${vehicle.vehicleName}`;
    const vehicleDocs = documents.filter(doc => doc.vehicleID === vehicleID);

    // Find the latest doc per type
    const latestPerType = {};

    vehicleDocs.forEach(doc => {
      const type = doc.documentType;
      const expiry = new Date(doc.expiryDate);

      if (!latestPerType[type] || new Date(latestPerType[type].expiryDate) < expiry) {
        latestPerType[type] = doc;
      }
    });

    // Display only latest of each document type
    Object.values(latestPerType).forEach(doc => {
      const expiryDate = new Date(doc.expiryDate);
      const daysLeft = Math.ceil((expiryDate - today) / 86400000);

      if (daysLeft <= 30) {
        const row = document.createElement('tr');
        row.className = daysLeft <= 0 ? 'due-red' : 'due-orange';

        row.innerHTML = `
          <td>${vehicleName}</td>
          <td>${doc.documentType}</td>
          <td>${expiryDate.toLocaleDateString()}</td>
          <td>${daysLeft} days</td>
        `;

        docTableBody.appendChild(row);
      }
    });
  });

})();


});
