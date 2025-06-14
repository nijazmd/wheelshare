document.addEventListener('DOMContentLoaded', async () => {
  const urlUser = getQueryParam('user');
  if (urlUser) {
    localStorage.setItem('currentUser', urlUser);
  }
  
  let currentUser = localStorage.getItem('currentUser');
  
  if (!currentUser) {
    showUserSelectPopup();
    return; // Stop here until user selects
  }
  


  const vehicleList = document.getElementById('vehicleList');
  const [allVehicles, serviceIntervals, maintenanceData, documents] = await Promise.all([
    fetchVehicleData(),
    fetchServiceIntervals(),
    fetchMaintenanceData(),
    fetchDocumentsData()
  ]);


const toggleBtn = document.getElementById('toggleFiltersBtn');
const groupBySelect = document.getElementById('groupByOption');
const filterPanel = document.querySelector('.filterSortPanel');

toggleBtn.addEventListener('click', () => {
  const isVisible = !filterPanel.classList.contains('hidden');
  filterPanel.classList.toggle('hidden');

  // Remove text toggle, add class toggle instead
  toggleBtn.classList.toggle('active', !isVisible);
});


  // Filter checkbox groups
  populateCheckboxGroup('filterMakeGroup', getUniqueValues(allVehicles, 'make'), 'filterMake');
  populateCheckboxGroup('filterCategoryGroup', getUniqueValues(allVehicles, 'category'), 'filterCategory');
  populateCheckboxGroup('filterClassGroup', getUniqueValues(allVehicles, 'class'), 'filterClass');
  populateCheckboxGroup('filterFuelTypeGroup', getUniqueValues(allVehicles, 'fuelType'), 'filterFuelType');
  populateCheckboxGroup('filterDrivetrainGroup', getUniqueValues(allVehicles, 'drivetrain'), 'filterDrivetrain');
  populateCheckboxGroup('filterGearboxGroup', getUniqueValues(allVehicles, 'gearbox'), 'filterGearbox');
  populateCheckboxGroup('filterColorGroup', getUniqueValues(allVehicles, 'colors'), 'filterColor');
  populateCheckboxGroup('filterOwnerGroup', getUniqueNamesFromField(allVehicles, 'owners'), 'filterOwner');
  populateCheckboxGroup('filterRcOwnerGroup', getUniqueValues(allVehicles, 'rcOwner'), 'filterRcOwner');



if (currentUser) {
  const greetingContainer = document.getElementById('userGreetingArea');
  if (greetingContainer) {
    const imgPath = `images/users/${currentUser}.jpg`;
    const fallbackImg = `images/users/user.jpg`;

    greetingContainer.innerHTML = `
      <div class="userContainer">
        <div class="profilePic">
          <img src="${imgPath}" alt="${currentUser}" onerror="this.onerror=null;this.src='${fallbackImg}';" />
        </div>
        <div class="userGreeting">Hello <span>${currentUser}</span></div>
      </div>
    `;
  }
}

let defaultGroup = 'class';


if (currentUser) {
  const ownsVehicles = allVehicles.some(v =>
    v.owners?.split(',').map(o => o.trim().toLowerCase()).includes(currentUser.toLowerCase())
  );
  if (ownsVehicles) {
    defaultGroup = 'owners';
  }
}
  
  
  const filtered = applyFilters(allVehicles);
  groupBySelect.value = defaultGroup;
  renderVehiclesGrouped(filtered, defaultGroup);
  
  

  // Trigger update on any filter/sort change
  document.querySelectorAll('input[type="checkbox"], #sortOption').forEach(el => {
    el.addEventListener('change', () => {
      const filtered = applyFilters(allVehicles);
      const sorted = applySort(filtered);
      renderVehiclesGrouped(sorted, groupBySelect.value);

    });
  });

  // Helpers
  function getUniqueValues(data, field) {
    return [...new Set(data.map(v => v[field]).filter(Boolean))].sort();
  }

  function getUniqueNamesFromField(data, field) {
    const names = new Set();
    data.forEach(v => {
      v[field]?.split(',').forEach(name => names.add(name.trim()));
    });
    return [...names].sort();
  }

  function populateCheckboxGroup(containerId, options, name) {
    const container = document.getElementById(containerId);
  
    // Derive actual field name
    const fieldMap = {
      filterMake: 'make',
      filterCategory: 'category',
      filterClass: 'class',
      filterFuelType: 'fuelType',
      filterDrivetrain: 'drivetrain',
      filterGearbox: 'gearbox',
      filterColor: 'colors',
      filterOwner: 'owners',
      filterRcOwner: 'rcOwner'
    };
    const field = fieldMap[name];
  
    // Build value counts
    const valueCounts = {};
    allVehicles.forEach(v => {
      let values = [];
  
      if (field === 'owners' || field === 'colors') {
        values = v[field]?.split(',').map(x => x.trim()) || [];
      } else {
        const val = v[field];
        if (val) values = [val];
      }
  
      values.forEach(val => {
        if (!val) return;
        valueCounts[val] = (valueCounts[val] || 0) + 1;
      });
    });
  
    // Render checkboxes and labels
    options.forEach(val => {
      const id = `${name}-${val.replace(/\s+/g, '')}`;
  
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = name;
      checkbox.value = val;
      checkbox.id = id;
      checkbox.classList.add('filterCheckbox');
  
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.classList.add('filterBtn');
  
      const count = valueCounts[val] || 0;
      label.innerHTML = `${val} <span class="filterCount">(${count})</span>`;
  
      container.appendChild(checkbox);
      container.appendChild(label);
    });
  }
  


function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(cb => cb.value);
}
document.getElementById('vehicleSearch').addEventListener('input', () => {
  const filtered = applyFilters(allVehicles);
  const sorted = applySort(filtered);
  renderVehiclesGrouped(filtered, groupBySelect.value);
});

function applyFilters(data) {
  const filters = {
    make: getCheckedValues('filterMake'),
    category: getCheckedValues('filterCategory'),
    class: getCheckedValues('filterClass'),
    fuelType: getCheckedValues('filterFuelType'),
    drivetrain: getCheckedValues('filterDrivetrain'),
    gearbox: getCheckedValues('filterGearbox'),
    colors: getCheckedValues('filterColor'),
    owner: getCheckedValues('filterOwner'),
    rcOwner: getCheckedValues('filterRcOwner')
  };

  let result = data.filter(v =>
    (!filters.make.length || filters.make.includes(v.make)) &&
    (!filters.category.length || filters.category.includes(v.category)) &&
    (!filters.class.length || filters.class.includes(v.class)) &&
    (!filters.fuelType.length || filters.fuelType.includes(v.fuelType)) &&
    (!filters.drivetrain.length || filters.drivetrain.includes(v.drivetrain)) &&
    (!filters.gearbox.length || filters.gearbox.includes(v.gearbox)) &&
    (!filters.colors.length || filters.colors.some(c => v.colors?.includes(c))) &&
    (!filters.owner.length || filters.owner.some(o => v.owners?.split(',').map(n => n.trim()).includes(o))) &&
    (!filters.rcOwner.length || filters.rcOwner.includes(v.rcOwner))
  );

  // Apply search filter
  const searchTerm = document.getElementById('vehicleSearch').value.trim().toLowerCase();
  if (searchTerm) {
    result = result.filter(v =>
      `${v.make} ${v.vehicleName}`.toLowerCase().includes(searchTerm) ||
      (v.owners || '').toLowerCase().includes(searchTerm) ||
      (v.rcOwner || '').toLowerCase().includes(searchTerm) ||
      (v.category || '').toLowerCase().includes(searchTerm) ||
      (v.class || '').toLowerCase().includes(searchTerm)
    );
  }

  return result;
}


  function applySort(data) {
    const sortField = document.getElementById('sortOption').value;
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aVal = parseFloat(a[sortField]) || 0;
      const bVal = parseFloat(b[sortField]) || 0;
      return bVal - aVal;
    });
  }

  document.getElementById('groupByOption').addEventListener('change', () => {
    const filtered = applyFilters(allVehicles);
    const sorted = applySort(filtered);
    renderVehiclesGrouped(filtered, groupBySelect.value);
  });

  
  

  function renderVehiclesGrouped(vehicles, groupBy) {

  vehicleList.innerHTML = '';
  const sortField = document.getElementById('sortOption').value;

  if (vehicles.length === 0) {
    vehicleList.innerHTML = '<p>No vehicles match the selected filters.</p>';
    return;
  }

  // Group by class
  const grouped = {};

  if (groupBy === 'owners') {
    const user = localStorage.getItem('currentUser');
    vehicles.forEach(v => {
      const ownerList = v.owners?.split(',').map(o => o.trim()) || [];
      const isMine = user && ownerList.some(o => o.trim().toLowerCase() === user.toLowerCase());

      const key = isMine ? 'My Wheels' : 'Shared Wheels';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(v);
    });
  } else {
    vehicles.forEach(v => {
      let key = groupBy === 'none' ? 'All Vehicles' : (v[groupBy] || 'Unknown');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(v);
    });
  }
  

  const groupOrder = ['My Wheels', 'Shared Wheels'];
const orderedKeys = groupOrder.filter(g => grouped[g]).concat(
  Object.keys(grouped).filter(k => !groupOrder.includes(k))
);

for (const groupName of orderedKeys) {
    const groupSection = document.createElement('div');
    groupSection.className = 'vehicleGroup';

    const heading = document.createElement('h2');
    const count = grouped[groupName].length;
    heading.innerHTML = `${groupName} <span class="filterCount">(${count})</span>`;
    
    groupSection.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'vehicleList';

    grouped[groupName].forEach(v => {
      const card = document.createElement('a');
      card.className = 'vehicleCard';
      card.href = `vehicle-single.html?vehicleID=${v.vehicleID}`;

      const sortInfo = sortField && v[sortField] ? `<p>${formatLabel(sortField)}: ${v[sortField]}</p>` : '';
      const maintStatus = getMaintenanceStatus(v, serviceIntervals, maintenanceData);
      let maintIcon = '';
      if (maintStatus === 'upcoming') maintIcon = '<span class="alertIcon maintIcon warning"><img src="images/icons/maintenance.svg" alt="Service Due"></span>';
      if (maintStatus === 'overdue') maintIcon = '<span class="alertIcon maintIcon danger"><img src="images/icons/maintenance.svg" alt="Document Due"></img></span>';
      card.innerHTML = `
        <img src="images/vehicles/${v.vehicleID}/1.jpg" alt="${v.vehicleName}" class="vehicleThumb" />
        <div class="vehicleInfo">
          ${maintIcon}
          <h3>${v.make} <span>${v.vehicleName}</span></h3>
          <div class="infoDetails">
          <div class="infoItem colTwo"><img src="images/icons/fuel.svg" alt="Fuel:">${v.fuelType || '–'}</div>
          <div class="infoItem colTwo"><img src="images/icons/engine.svg" alt="">${v.displacement ? v.displacement + ' cc' : '–'}</div>
          <div class="infoItem colTwo"><img src="images/icons/power.svg" alt="">${v.power || '–'}</div>
          <div class="infoItem colTwo"><img src="images/icons/torque.svg" alt="">${v.torque ? v.torque + ' Nm' : '–'}</div>
          <div class="infoItem colOne">${sortInfo}</div>
          </div>
        </div>
      `;

      const today = new Date();
      const latestDocs = {}; // { vehicleID_documentType: { expiryDate: Date, ...doc } }
      
      documents.forEach(doc => {
        const key = `${doc.vehicleID}_${doc.documentType}`;
        const current = latestDocs[key];
        const expiry = new Date(doc.expiryDate);
      
        if (!current || new Date(current.expiryDate) < expiry) {
          latestDocs[key] = doc;
        }
      });
      
      const hasOverdueDoc = Object.values(latestDocs).some(doc => {
        return doc.vehicleID === v.vehicleID && new Date(doc.expiryDate) < today;
      });
      

      if (hasOverdueDoc) {
        const docIcon = document.createElement('span');
        docIcon.className = 'alertIcon docIcon danger';
        docIcon.innerHTML = '<img src="images/icons/doc.svg" alt="Document Due">';
        card.appendChild(docIcon);
      }      

      grid.appendChild(card);
    });

    groupSection.appendChild(grid);
    vehicleList.appendChild(groupSection);
  }
}


  function formatLabel(field) {
    return {
      modelYear: 'Model Year',
      registrationYear: 'Registration Year',
      owningDate: 'Owning Date',
      displacement: 'Displacement',
      power: 'Power',
      torque: 'Torque',
      fuelEconomy: 'Fuel Economy'
    }[field] || field;
  }

  
  function getMaintenanceStatus(vehicle, intervals, maintenance) {
  const vehicleID = vehicle.vehicleID;
  const currentOdo = parseInt(vehicle.CurrentOdometer || '0');
  const today = new Date();

  const vehicleIntervals = intervals.filter(i => i.vehicleID === vehicleID);
  const vehicleMaintenance = maintenance.filter(m => m.vehicleID === vehicleID);

  let status = 'normal';

  for (const interval of vehicleIntervals) {
    const { component, replaceKM, intervalDays } = interval;
    const records = vehicleMaintenance
      .filter(m => m.serviceType === component)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = records[0];

    if (!last) continue;

    const lastOdo = parseInt(last.odometer || '0');
    const lastDate = new Date(last.date);
    const nextOdo = lastOdo + parseInt(replaceKM || '0');
    const nextDate = new Date(lastDate.getTime() + parseInt(intervalDays || '0') * 86400000);

    const odoDiff = nextOdo - currentOdo;
    const dateDiff = (nextDate - today) / 86400000;

    if (odoDiff <= 0 || dateDiff <= 0) return 'overdue';
    if (odoDiff <= 1001 || dateDiff <= 30) status = 'upcoming';
  }

  const greetingContainer = document.getElementById('userGreetingArea');
  if (greetingContainer) {
    greetingContainer.style.cursor = 'pointer';
    greetingContainer.addEventListener('click', showUserSelectPopup);
  }


  return status;
  
}
});

function showUserSelectPopup() {
  const users = [
    'Adnan', 'Hidash', 'Ishan', 'Jahamgeer', 'Mujeeb', 'Nijas', 'Nisar', 'Shaad', 'Others'
  ]; // Update this array based on your actual usernames

  const container = document.getElementById('userSelectList');
  const popup = document.getElementById('userSelectPopup');

  container.innerHTML = ''; // Clear existing, if any

  users.forEach(user => {
    const userDiv = document.createElement('div');
    userDiv.classList.add('userContainer');
    userDiv.innerHTML = `
      <div class="profilePic">
        <img src="images/users/${user}.jpg" alt="${user}" onerror="this.onerror=null;this.src='images/users/user.jpg';">
      </div>
      <div class="userGreeting"><span>${user}</span></div>
    `;
    userDiv.addEventListener('click', () => {
      localStorage.setItem('currentUser', user);
      popup.style.display = 'none';
      location.reload(); // Force full reload to use currentUser logic
    });

    container.appendChild(userDiv);
  });

  popup.style.display = 'flex';
}

// Register the service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log('✅ Service Worker registered'))
    .catch(err => console.error('Service Worker failed:', err));
}

