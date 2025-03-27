// Sample data for recently found items
const recentItems = [
    {
        id: 1,
        name: 'Yellow Notebook',
        category: 'School Supplies',
        location: 'Student Lounge',
        date: '3/13/2025',
        status: 'Available',
        image: 'Yellow Notebook.jpg'
    },
    {
        id: 2,
        name: 'White Umbrella',
        category: 'Personal Items',
        location: '2nd Floor',
        date: '3/13/2025',
        status: 'Pending',
        image: 'White Umbrella.jpg'
    },
    {
        id: 3,
        name: 'Nametag - Kathy Smith',
        category: 'Miscellaneous',
        location: '3rd Floor',
        date: '3/12/2025',
        status: 'Available',
        image: 'Name Tag.jpg'
    }
];

// Function to create item cards
function createItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
        <div class="status-badge ${item.status.toLowerCase()}">${item.status}</div>
        <img src="${item.image}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p><i class="fas fa-tag"></i> ${item.category}</p>
        <p><i class="fas fa-map-marker-alt"></i> ${item.location}</p>
        <p><i class="fas fa-calendar"></i> ${item.date}</p>
        <button onclick="viewDetails(${item.id})">View Details</button>
    `;
    return card;
}

// Function to populate recently found items
function populateRecentItems() {
    const itemsGrid = document.querySelector('.items-grid');
    recentItems.forEach(item => {
        itemsGrid.appendChild(createItemCard(item));
    });
}

// Function to handle view details
function viewDetails(itemId) {
    // Implement view details functionality
    console.log(`Viewing details for item ${itemId}`);
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    populateRecentItems();
});

// Add some interactivity to the sidebar
document.querySelectorAll('.sidebar li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelector('.sidebar li.active')?.classList.remove('active');
        this.classList.add('active');
    });
}); 