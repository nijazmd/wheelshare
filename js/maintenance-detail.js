document.addEventListener('DOMContentLoaded', async () => {
  const vehicleID = getQueryParam('vehicleID');
  const odo = getQueryParam('odo');

  const [vehicles, maintenance] = await Promise.all([
    fetchVehicleData(),
    fetchMaintenanceData()
  ]);

  const vehicle = vehicles.find(v => v.vehicleID === vehicleID);
  if (!vehicle) {
    document.getElementById('pageTitle').textContent = "Vehicle Not Found";
    return;
  }

  const records = maintenance.filter(
    m => m.vehicleID === vehicleID && m.odometer === odo
  );

  if (records.length === 0) {
    document.getElementById('detailTableBody').innerHTML =
      '<tr><td colspan="4">No maintenance entries found.</td></tr>';
    return;
  }

  // Summary Info
  document.getElementById('vehicleName').textContent = `${vehicle.make} ${vehicle.vehicleName}`;
  document.getElementById('odoReading').textContent = `${odo} km`;
  document.getElementById('maintDate').textContent = records[0].date;
  document.getElementById('totalCost').textContent = records
    .reduce((sum, r) => sum + parseFloat(r.cost || 0), 0)
    .toLocaleString();

  // Details
  const tableBody = document.getElementById('detailTableBody');
  records.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.serviceType}</td>
      <td>${r.action}</td>
      <td>₹ ${r.cost}</td>
      <td>${r.notes || ''}</td>
    `;
    tableBody.appendChild(tr);
  });
});
