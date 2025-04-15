// EcoTrack - Food Waste Tracker JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Initialize the application
  initThemeToggle();
  initCharts();
  initLogWasteModal();
  initChatbot();
  initWasteForm();
  initInventoryTracking();

  updateDashboardWithWasteData();
  loadInventoryFromStorage();

  // Add animation classes to elements
  document.querySelectorAll(".chat-message").forEach((el) => {
    el.classList.add("animate-fade-in");
  });

  // Add hover effects to cards
  document.querySelectorAll(".bg-white.rounded-lg").forEach((card) => {
    card.classList.add("card-hover");
  });
});

function initInventoryTracking() {
  // Add inventory form submission handler
  const inventoryForm = document.getElementById("inventory-form");
  if (inventoryForm) {
    inventoryForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Get form values
      const foodItem = document.getElementById("inv-food-item").value;
      const quantity = document.getElementById("inv-quantity").value;
      const unit = document.getElementById("inv-unit").value;
      const category = document.getElementById("inv-category").value;
      const purchaseDate =
        document.getElementById("purchase-date").value ||
        new Date().toISOString().split("T")[0];

      // Estimate expiry date
      const expiryDate = estimateExpiryDate(foodItem, category);

      // Create inventory item
      const inventoryItem = {
        id: Date.now(), // Simple unique ID
        foodItem,
        quantity,
        unit,
        category,
        purchaseDate,
        expiryDate: expiryDate.toISOString().split("T")[0],
        isConsumed: false,
      };

      addToInventory(inventoryItem);

      // Reset form
      inventoryForm.reset();

      // Close modal if needed
      const closeInventoryModal = document.getElementById(
        "close-inventory-modal"
      );
      if (closeInventoryModal) closeInventoryModal.click();

      // Show success message
      showNotification("Item added to inventory!", "success");
    });
  }

  const trackFoodBtn = document.getElementById("track-food-btn");
  if (trackFoodBtn) {
    trackFoodBtn.addEventListener("click", function () {
      const inventoryModal = document.getElementById("inventory-modal");
      if (inventoryModal) {
        inventoryModal.classList.remove("hidden");
        inventoryModal
          .querySelector(".bg-white.dark\\:bg-gray-800")
          .classList.add("modal-enter");
      }
    });
  }

  const closeInventoryModal = document.getElementById("close-inventory-modal");
  if (closeInventoryModal) {
    closeInventoryModal.addEventListener("click", function () {
      const inventoryModal = document.getElementById("inventory-modal");
      const modalContent = inventoryModal.querySelector(
        ".bg-white.dark\\:bg-gray-800"
      );
      modalContent.classList.remove("modal-enter");
      modalContent.classList.add("modal-leave");

      setTimeout(() => {
        inventoryModal.classList.add("hidden");
        modalContent.classList.remove("modal-leave");
      }, 300);
    });
  }
}

// Fix addToInventory and related functions

// Add the missing estimateExpiryDate function if it's not already defined

// Estimate expiry date for food items
function estimateExpiryDate(foodItem, category) {
  const today = new Date();
  let daysToAdd = 7; // Default expiry of 7 days

  // Make sure foodItem is lowercase for comparison
  const foodItemLower = foodItem.toLowerCase();

  // Expiry estimates based on category and specific items
  const expiryGuides = {
    "fruits & vegetables": {
      default: 7,
      apple: 14,
      banana: 5,
      berries: 3,
      lettuce: 5,
      tomato: 7,
      cucumber: 7,
      onion: 30,
      potato: 21,
      avocado: 5,
      carrot: 21,
      broccoli: 7,
    },
    dairy: {
      default: 7,
      milk: 7,
      yogurt: 14,
      cheese: 21,
      butter: 30,
      cream: 7,
    },
    "meat & fish": {
      default: 3,
      chicken: 2,
      beef: 3,
      pork: 3,
      fish: 2,
      seafood: 1,
    },
    "grains & bread": {
      default: 7,
      bread: 7,
      rice: 365,
      pasta: 365,
      cereal: 180,
      flour: 180,
    },
    other: {
      default: 14,
    },
  };

  // Get the category data
  const categoryData =
    expiryGuides[category.toLowerCase()] || expiryGuides.other;
  console.log("Category data for", category, ":", categoryData);

  // Check for specific food item expiry
  for (const item in categoryData) {
    if (foodItemLower.includes(item)) {
      daysToAdd = categoryData[item];
      console.log(
        "Found specific item match:",
        item,
        "with expiry days:",
        daysToAdd
      );
      break;
    }
  }

  // If no specific match was found, use the default for this category
  if (daysToAdd === 7 && categoryData.default !== 7) {
    daysToAdd = categoryData.default;
    console.log("Using category default:", daysToAdd);
  }

  // Calculate expiry date
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + daysToAdd);

  console.log(
    "Estimated expiry date for",
    foodItem,
    ":",
    expiryDate.toISOString().split("T")[0]
  );
  return expiryDate;
}

function addToInventory(item) {
  // Get existing inventory
  const inventory = JSON.parse(localStorage.getItem("foodInventory") || "[]");

  // Add new item
  inventory.push(item);

  // Save back to storage
  localStorage.setItem("foodInventory", JSON.stringify(inventory));

  // Update UI
  updateInventoryUI();

  // Log to console for debugging
  console.log("Item added to inventory:", item);
  console.log("Current inventory:", inventory);
}

function updateInventoryUI() {
  const inventory = JSON.parse(localStorage.getItem("foodInventory") || "[]");
  const inventoryContainer = document.getElementById("inventory-list");

  if (!inventoryContainer) {
    console.error("Inventory container not found");
    return;
  }

  console.log("Updating inventory UI with", inventory.length, "items");

  // Sort by expiry date (soonest first)
  inventory.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  // Clear container
  inventoryContainer.innerHTML = "";

  // Check if inventory is empty
  if (inventory.filter((item) => !item.isConsumed).length === 0) {
    inventoryContainer.innerHTML = `
            <div class="p-4 text-center text-gray-500 dark:text-gray-400">
                <p>No items in inventory yet. Add some using the button above!</p>
            </div>
        `;
    return;
  }

  // Add items
  inventory.forEach((item) => {
    if (item.isConsumed) return; // Skip consumed items

    const daysUntilExpiry = getDaysUntil(item.expiryDate);
    let expiryClass = "";

    if (daysUntilExpiry < 0) {
      expiryClass = "text-red-600 dark:text-red-400";
    } else if (daysUntilExpiry <= 2) {
      expiryClass = "text-orange-600 dark:text-orange-400";
    } else if (daysUntilExpiry <= 5) {
      expiryClass = "text-yellow-600 dark:text-yellow-400";
    }

    const itemElement = document.createElement("div");
    itemElement.className =
      "flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700";
    itemElement.innerHTML = `
            <div>
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">${
                  item.foodItem
                }</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">${
                  item.quantity
                } ${item.unit} · ${item.category}</p>
                <p class="text-xs ${expiryClass}">
                    <i class="fas fa-clock mr-1"></i>
                    ${
                      daysUntilExpiry < 0
                        ? "Expired!"
                        : daysUntilExpiry === 0
                        ? "Expires today!"
                        : `Expires in ${daysUntilExpiry} days`
                    } (${formatDate(item.expiryDate)})
                </p>
            </div>
            <div class="flex space-x-2">
                <button class="p-1 text-gray-400 hover:text-green-500 consume-item" data-id="${
                  item.id
                }">
                    <i class="fas fa-check-circle"></i>
                </button>
                <button class="p-1 text-gray-400 hover:text-red-500 waste-item" data-id="${
                  item.id
                }">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

    inventoryContainer.appendChild(itemElement);
  });

  // Add event listeners after adding elements to DOM
  document.querySelectorAll(".consume-item").forEach((btn) => {
    btn.addEventListener("click", function () {
      markItemConsumed(btn.dataset.id);
    });
  });

  document.querySelectorAll(".waste-item").forEach((btn) => {
    btn.addEventListener("click", function () {
      markItemWasted(btn.dataset.id);
    });
  });

  // Update expiry warnings
  updateExpiryWarnings(inventory);
}

function markItemConsumed(id) {
  const inventory = JSON.parse(localStorage.getItem("foodInventory") || "[]");
  const itemIndex = inventory.findIndex((item) => item.id == id);

  if (itemIndex >= 0) {
    inventory[itemIndex].isConsumed = true;
    localStorage.setItem("foodInventory", JSON.stringify(inventory));
    updateInventoryUI();
    showNotification("Item marked as consumed!", "success");
  }
}

function markItemWasted(id) {
  const inventory = JSON.parse(localStorage.getItem("foodInventory") || "[]");
  const itemIndex = inventory.findIndex((item) => item.id == id);

  if (itemIndex >= 0) {
    const item = inventory[itemIndex];

    // Log the waste
    const wasteEntry = {
      foodItem: item.foodItem,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      reason: "Expired/Wasted",
      timestamp: new Date().toISOString(),
    };

    storeWasteData(wasteEntry);

    // Remove from inventory
    inventory.splice(itemIndex, 1);
    localStorage.setItem("foodInventory", JSON.stringify(inventory));

    // Update UI
    updateInventoryUI();
    addRecentActivity(
      item.foodItem,
      item.quantity,
      item.unit,
      "Expired/Wasted"
    );
    showNotification(
      "Item marked as wasted and logged to waste tracker.",
      "info"
    );
  }
}

function updateExpiryWarnings(inventory) {
  const warningsContainer = document.getElementById("expiry-warnings");
  if (!warningsContainer) return;

  // Clear container
  warningsContainer.innerHTML = "";

  // Filter for items expiring soon (non-consumed)
  const expiringItems = inventory.filter((item) => {
    if (item.isConsumed) return false;
    const daysUntil = getDaysUntil(item.expiryDate);
    return daysUntil <= 3 && daysUntil >= 0;
  });

  // Sort by expiry (soonest first)
  expiringItems.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

  // Limit to 3 items
  const topItems = expiringItems.slice(0, 3);

  if (topItems.length === 0) {
    warningsContainer.innerHTML = `
            <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p class="text-sm text-gray-600 dark:text-gray-300">No items expiring soon!</p>
            </div>
        `;
    return;
  }

  topItems.forEach((item) => {
    const daysUntil = getDaysUntil(item.expiryDate);
    const warningEl = document.createElement("div");
    warningEl.className =
      "flex p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg items-center";

    let urgencyIcon = "fas fa-exclamation-circle text-yellow-500";
    if (daysUntil === 0) {
      urgencyIcon = "fas fa-exclamation-triangle text-red-500";
    }

    warningEl.innerHTML = `
            <div class="flex-shrink-0 mr-3">
                <i class="${urgencyIcon}"></i>
            </div>
            <div>
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">${
                  item.foodItem
                } expiring ${daysUntil === 0 ? "today!" : "soon!"}</h3>
                <p class="text-xs text-gray-600 dark:text-gray-300">Use within ${
                  daysUntil === 0 ? "today" : daysUntil + " days"
                } to avoid waste</p>
            </div>
        `;

    warningsContainer.appendChild(warningEl);
  });
}

// Theme Toggle Functionality
function initThemeToggle() {
  const themeToggle = document.getElementById("theme-toggle");

  // Check for saved theme preference or respect OS theme setting
  if (
    localStorage.getItem("theme") === "dark" ||
    (!localStorage.getItem("theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Toggle theme on button click
  themeToggle.addEventListener("click", function () {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  });
}

// Initialize Charts
function initCharts() {
  // Waste trends chart
  const wasteCtx = document.getElementById("wasteChart").getContext("2d");
  const wasteChart = new Chart(wasteCtx, {
    type: "line",
    data: {
      labels: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      datasets: [
        {
          label: "Food Waste (g)",
          data: [300, 450, 320, 500, 280, 200, 150],
          backgroundColor: "rgba(72, 187, 120, 0.2)",
          borderColor: "rgba(72, 187, 120, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(72, 187, 120, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(72, 187, 120, 1)",
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          titleColor: "#1F2937",
          bodyColor: "#1F2937",
          borderColor: "rgba(72, 187, 120, 1)",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            labelTextColor: function () {
              return "#1F2937";
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            borderDash: [3, 3],
          },
          ticks: {
            stepSize: 100,
          },
        },
      },
    },
  });

  // Categories pie chart
  const categoryCtx = document.getElementById("categoryChart").getContext("2d");
  const categoryChart = new Chart(categoryCtx, {
    type: "doughnut",
    data: {
      labels: [
        "Fruits & Vegetables",
        "Dairy",
        "Grains & Bread",
        "Meat & Fish",
        "Other",
      ],
      datasets: [
        {
          data: [42, 28, 15, 10, 5],
          backgroundColor: [
            "rgba(72, 187, 120, 0.8)", // Green
            "rgba(66, 153, 225, 0.8)", // Blue
            "rgba(236, 201, 75, 0.8)", // Yellow
            "rgba(245, 101, 101, 0.8)", // Red
            "rgba(159, 122, 234, 0.8)", // Purple
          ],
          borderColor: [
            "rgba(72, 187, 120, 1)",
            "rgba(66, 153, 225, 1)",
            "rgba(236, 201, 75, 1)",
            "rgba(245, 101, 101, 1)",
            "rgba(159, 122, 234, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          titleColor: "#1F2937",
          bodyColor: "#1F2937",
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            labelTextColor: function () {
              return "#1F2937";
            },
          },
        },
      },
      cutout: "70%",
    },
  });

  // Update charts when dark mode changes
  const updateChartsForTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");

    // Update text colors for waste chart
    wasteChart.options.scales.x.ticks.color = isDark ? "#D1D5DB" : "#4B5563";
    wasteChart.options.scales.y.ticks.color = isDark ? "#D1D5DB" : "#4B5563";
    wasteChart.options.scales.x.grid.color = isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";
    wasteChart.options.scales.y.grid.color = isDark
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";

    // Update tooltip styles for both charts
    const tooltipConfig = {
      backgroundColor: isDark
        ? "rgba(31, 41, 55, 0.9)"
        : "rgba(255, 255, 255, 0.9)",
      titleColor: isDark ? "#F9FAFB" : "#1F2937",
      bodyColor: isDark ? "#F9FAFB" : "#1F2937",
      borderColor: isDark ? "rgba(72, 187, 120, 0.5)" : "rgba(72, 187, 120, 1)",
    };

    wasteChart.options.plugins.tooltip = {
      ...wasteChart.options.plugins.tooltip,
      ...tooltipConfig,
    };
    categoryChart.options.plugins.tooltip = {
      ...categoryChart.options.plugins.tooltip,
      ...tooltipConfig,
    };

    wasteChart.update();
    categoryChart.update();
  };

  // Initial update based on current theme
  updateChartsForTheme();

  // Update when theme changes
  document
    .getElementById("theme-toggle")
    .addEventListener("click", updateChartsForTheme);
}

// Initialize Waste Logging Modal
function initLogWasteModal() {
  const logWasteBtn = document.getElementById("log-waste-btn");
  const wasteModal = document.getElementById("waste-modal");
  const closeModal = document.getElementById("close-modal");

  logWasteBtn.addEventListener("click", function () {
    wasteModal.classList.remove("hidden");
    wasteModal
      .querySelector(".bg-white.dark\\:bg-gray-800")
      .classList.add("modal-enter");
  });

  closeModal.addEventListener("click", function () {
    const modalContent = wasteModal.querySelector(
      ".bg-white.dark\\:bg-gray-800"
    );
    modalContent.classList.remove("modal-enter");
    modalContent.classList.add("modal-leave");

    setTimeout(() => {
      wasteModal.classList.add("hidden");
      modalContent.classList.remove("modal-leave");
    }, 300);
  });

  // Close modal when clicking outside
  wasteModal.addEventListener("click", function (e) {
    if (e.target === wasteModal) {
      closeModal.click();
    }
  });
}

// Initialize waste form submission
function initWasteForm() {
  const wasteForm = document.getElementById("waste-form");

  wasteForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Get form values
    const foodItem = document.getElementById("food-item").value;
    const quantity = document.getElementById("quantity").value;
    const unit = document.getElementById("unit").value;
    const category = document.getElementById("category").value;
    const reason = document.getElementById("reason").value;

    const weightInGrams = unit === "kg" ? quantity * 1000 : quantity;
    const co2Impact = calculateCO2Equivalent(category, weightInGrams);

    // Create a new waste entry
    const wasteEntry = {
      foodItem,
      quantity,
      unit,
      category,
      reason,
      co2Impact,
      timestamp: new Date().toISOString(),
    };

    // Store the waste data
    storeWasteData(wasteEntry);

    // Create a new waste entry (in a real app, this would be sent to a server)
    console.log("Logging waste:", {
      foodItem,
      quantity,
      unit,
      category,
      reason,
    });

    // Add to recent activity (simplified for demo)
    addRecentActivity(foodItem, quantity, unit, reason);

    // Close the modal
    document.getElementById("close-modal").click();

    // Reset form
    wasteForm.reset();

    // Show success message
    showNotification("Waste logged successfully!", "success");
  });
}

// Add to recent activity
// Fix the activity selector

// Add/fix waste data storage functions

// Store waste data in local storage
function storeWasteData(data) {
  // Get existing data
  const existingData = JSON.parse(localStorage.getItem("wasteData") || "[]");

  // Add new data
  existingData.push(data);

  // Save back to local storage
  localStorage.setItem("wasteData", JSON.stringify(existingData));

  console.log("Waste data stored:", data);
  console.log("Total waste entries:", existingData.length);

  // Update UI with the new data
  updateDashboardWithWasteData();
}

// Function to get all stored waste data
function getWasteData() {
  return JSON.parse(localStorage.getItem("wasteData") || "[]");
}

// Update dashboard with waste data
function updateDashboardWithWasteData() {
  const wasteData = getWasteData();

  if (wasteData.length === 0) return;

  // Calculate this week's waste
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeekWaste = wasteData
    .filter((item) => new Date(item.timestamp) >= startOfWeek)
    .reduce((total, item) => {
      // Convert all to grams for consistency
      let weight = parseFloat(item.quantity);
      if (item.unit === "kg") weight *= 1000;
      return total + weight;
    }, 0);

  console.log("This week waste calculation:", thisWeekWaste, "grams");

  // Update summary card
  const thisWeekElement = document.querySelector(
    ".sm\\:grid-cols-3 > div:first-child p.text-2xl"
  );
  if (thisWeekElement) {
    thisWeekElement.textContent =
      thisWeekWaste >= 1000
        ? `${(thisWeekWaste / 1000).toFixed(1)} kg`
        : `${Math.round(thisWeekWaste)} g`;
    console.log("Updated this week element:", thisWeekElement.textContent);
  } else {
    console.error("This week element not found");
  }

  // TODO: Update CO2 impact
  updateCO2Impact(wasteData);

  // TODO: Update charts
  updateWasteCharts(wasteData);
}

// Calculate total CO2 impact
function updateCO2Impact(wasteData) {
  if (!wasteData || wasteData.length === 0) return;

  // Calculate total CO2 impact
  const totalCO2 = wasteData.reduce((total, item) => {
    // If we have precalculated CO2 impact, use it
    if (item.co2Impact) return total + item.co2Impact;

    // Otherwise calculate it
    const weightInGrams =
      item.unit === "kg" ? item.quantity * 1000 : item.quantity;
    return total + calculateCO2Equivalent(item.category, weightInGrams);
  }, 0);

  // Update the impact card
  const impactElement = document.querySelector(
    ".sm\\:grid-cols-3 > div:nth-child(3) p.text-2xl"
  );
  if (impactElement) {
    impactElement.textContent = `${totalCO2.toFixed(1)} kg CO₂`;
    console.log("Updated CO2 impact:", totalCO2.toFixed(1), "kg");
  }
}

// Update waste charts with real data
function updateWasteCharts(wasteData) {
  if (!wasteData || wasteData.length === 0) return;

  const wasteCtx = document.getElementById("wasteChart");
  if (!wasteCtx) {
    console.error("Waste chart canvas not found");
    return;
  }

  const chart = Chart.getChart(wasteCtx);
  if (!chart) {
    console.error("Chart instance not found");
    return;
  }

  // Group data by day of week
  const dayData = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

  // Last 7 days data
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  wasteData
    .filter((item) => new Date(item.timestamp) >= weekAgo)
    .forEach((item) => {
      const date = new Date(item.timestamp);
      const dayOfWeek = date.getDay(); // 0-6
      const weightInGrams =
        item.unit === "kg" ? item.quantity * 1000 : parseFloat(item.quantity);

      if (!isNaN(weightInGrams)) {
        dayData[dayOfWeek] += weightInGrams;
      }
    });

  // Update chart data
  chart.data.datasets[0].data = dayData;

  // Rearrange to start from Monday (1) to Sunday (0)
  const mondayFirst = [...dayData.slice(1), dayData[0]];
  chart.data.datasets[0].data = mondayFirst;

  chart.update();
  console.log("Updated waste chart with data:", mondayFirst);
}

function addRecentActivity(foodItem, quantity, unit, reason) {
  // Look for the recent activity container more reliably
  const recentActivity = document.querySelector(
    ".bg-white.dark\\:bg-gray-800 .space-y-4"
  );

  // Debug info
  console.log("Adding to recent activity:", foodItem, quantity, unit, reason);
  console.log("Recent activity container:", recentActivity);

  if (!recentActivity) {
    console.error("Recent activity container not found");
    return;
  }

  const now = new Date();
  const timeString =
    now.getHours() +
    ":" +
    (now.getMinutes() < 10 ? "0" : "") +
    now.getMinutes();

  // Create new activity element
  const activityEl = document.createElement("div");
  activityEl.classList.add("flex", "animate-fade-in");

  // Determine icon based on food category
  let iconClass = "fas fa-apple-alt";
  if (
    foodItem.toLowerCase().includes("milk") ||
    foodItem.toLowerCase().includes("cheese")
  ) {
    iconClass = "fas fa-cheese";
  } else if (foodItem.toLowerCase().includes("bread")) {
    iconClass = "fas fa-bread-slice";
  } else if (
    foodItem.toLowerCase().includes("meat") ||
    foodItem.toLowerCase().includes("fish")
  ) {
    iconClass = "fas fa-drumstick-bite";
  }

  activityEl.innerHTML = `
        <div class="flex-shrink-0 mr-3">
            <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400">
                <i class="${iconClass}"></i>
            </div>
        </div>
        <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">${foodItem} (${quantity} ${unit}) - ${reason}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Today, ${timeString}</p>
        </div>
    `;

  // Add to recent activity list
  recentActivity.prepend(activityEl);

  // Remove oldest activity if there are more than 3
  const activities = recentActivity.querySelectorAll(".flex");
  if (activities.length > 3) {
    activities[activities.length - 1].remove();
  }
}

// Show notification
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.classList.add(
    "fixed",
    "top-4",
    "right-4",
    "p-4",
    "rounded-lg",
    "shadow-lg",
    "animate-fade-in",
    "max-w-sm",
    "z-50"
  );

  // Set color based on type
  if (type === "success") {
    notification.classList.add("bg-green-500", "text-white");
  } else if (type === "error") {
    notification.classList.add("bg-red-500", "text-white");
  } else {
    notification.classList.add("bg-blue-500", "text-white");
  }

  notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0 mr-3">
                <i class="fas ${
                  type === "success"
                    ? "fa-check-circle"
                    : type === "error"
                    ? "fa-exclamation-circle"
                    : "fa-info-circle"
                }"></i>
            </div>
            <div>
                <p>${message}</p>
            </div>
        </div>
    `;

  // Add to document
  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove("animate-fade-in");
    notification.classList.add(
      "opacity-0",
      "transition-opacity",
      "duration-300"
    );
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize AI Chatbot with Gemini API
function initChatbot() {
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-chat");
  const chatMessages = document.getElementById("chat-messages");

  // Gemini API configuration
  const GEMINI_API_KEY = "AIzaSyC7kUVWlLqmvP2E5Os9QP0oecEy6XS22JM";
  const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}";

  // Send message function
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addMessageToChat(message, true);
    chatInput.value = "";

    // Show loading indicator
    const loadingElement = document.createElement("div");
    loadingElement.id = "chat-loading";
    loadingElement.classList.add("flex", "items-start", "chat-message");
    loadingElement.innerHTML = `
            <div class="flex-shrink-0 mr-2">
                <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
                    <i class="fas fa-robot text-sm"></i>
                </div>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 max-w-xs">
                <p class="text-sm text-gray-800 dark:text-gray-200">
                    <span class="inline-block animate-pulse">Thinking...</span>
                </p>
            </div>
        `;
    chatMessages.appendChild(loadingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      // Get inventory for context
      const inventory = JSON.parse(
        localStorage.getItem("foodInventory") || "[]"
      );
      const activeInventory = inventory.filter((item) => !item.isConsumed);

      // Get expiring items
      const expiringItems = activeInventory
        .filter((item) => {
          const daysUntil = getDaysUntil(item.expiryDate);
          return daysUntil <= 5;
        })
        .map(
          (item) =>
            `${item.foodItem} (expires in ${getDaysUntil(
              item.expiryDate
            )} days)`
        );

      // Create inventory context
      let inventoryContext = "";
      if (activeInventory.length > 0) {
        inventoryContext = `\nYou have the following items in your inventory: ${activeInventory
          .map((item) => item.foodItem)
          .join(", ")}.`;

        if (expiringItems.length > 0) {
          inventoryContext += `\nItems expiring soon: ${expiringItems.join(
            ", "
          )}.`;
        }
      }

      let isLeftoverQuery =
        message.toLowerCase().includes("leftover") ||
        message.toLowerCase().includes("recipe") ||
        message.toLowerCase().includes("use up") ||
        message.toLowerCase().includes("what can i make") ||
        message.toLowerCase().includes("what to do with");

      // Prepare context for food waste specific responses
      let contextPrompt = "";

      if (isLeftoverQuery) {
        contextPrompt = `
                    You are EcoBot, an AI assistant for a food waste tracking app called EcoTrack.
                    Your PRIMARY purpose is to provide recipe ideas for leftover ingredients.

                    IMPORTANT: Be specific and give concrete recipe suggestions, not general advice.

                    If the user is asking about using specific ingredients, suggest 2-3 specific recipe ideas with brief instructions.
                    Format recipe suggestions with emoji icons and bullet points for ingredients.${inventoryContext}

                    User's query: ${message}
                `;
      } else {
        contextPrompt = `
                    You are EcoBot, an AI assistant for a food waste tracking app called EcoTrack.
                    Your primary purpose is to help users reduce their food waste by providing:
                    1. Food storage tips to extend freshness
                    2. Recipe suggestions for using leftover ingredients
                    3. Information about the environmental impact of food waste
                    4. Tips for reducing food waste in daily life
                    5. Information about food donation options${inventoryContext}

                    Keep your responses focused specifically on food waste reduction.
                    Keep your responses concise (1-3 sentences) and friendly.
                    If you don't know something related to food waste, suggest a general tip instead.

                    User's query: ${message}
                `;
      }

      const response = await callGeminiAPI(contextPrompt);

      // Remove loading indicator
      const loadingIndicator = document.getElementById("chat-loading");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      // Add AI response to chat
      addMessageToChat(response, false);
    } catch (error) {
      console.error("Error calling Gemini API:", error);

      // Remove loading indicator
      const loadingIndicator = document.getElementById("chat-loading");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      // Add error message to chat
      addMessageToChat(
        "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        false
      );
    }
  }

  // Call Gemini API
  async function callGeminiAPI(prompt) {
    try {
      // Use template literals to correctly insert the API key
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250,
          },
        }),
      });

      const data = await response.json();
      console.log("API Response:", data); // Debug API response

      if (
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0
      ) {
        return data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message}`);
      } else {
        throw new Error("Unexpected response structure from Gemini API");
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  }

  // Add message to chat
  function addMessageToChat(message, isUser) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("flex", "items-start", "chat-message");

    if (isUser) {
      messageElement.innerHTML = `
                <div class="flex-1 flex justify-end">
                    <div class="bg-green-100 dark:bg-green-900 rounded-lg p-2 max-w-xs">
                        <p class="text-sm text-gray-800 dark:text-green-100">${message}</p>
                    </div>
                </div>
                <div class="flex-shrink-0 ml-2">
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                        <i class="fas fa-user text-sm"></i>
                    </div>
                </div>
            `;
    } else {
      messageElement.innerHTML = `
                <div class="flex-shrink-0 mr-2">
                    <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
                        <i class="fas fa-robot text-sm"></i>
                    </div>
                </div>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 max-w-xs">
                    <p class="text-sm text-gray-800 dark:text-gray-200">${message}</p>
                </div>
            `;
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Event listeners
  sendButton.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // Initial bot message
  setTimeout(() => {
    addMessageToChat(
      "Hi there! I'm your EcoBot assistant. Ask me about recipes for leftovers, food storage tips, or ways to reduce waste.",
      false
    );
  }, 1000);
}

// Utility Functions
// Get days until a date
function getDaysUntil(dateString) {
  const now = new Date();
  const targetDate = new Date(dateString);
  const diffTime = targetDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format date for display
function formatDate(dateString) {
  const options = { month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Calculate CO2 equivalent for food waste
function calculateCO2Equivalent(foodType, weightGrams) {
  // Average CO2e values per kg of food waste
  const co2eValues = {
    fruits_vegetables: 0.5, // kg CO2e per kg
    dairy: 1.9,
    grains_bread: 1.4,
    meat_fish: 5.3,
    other: 2.0,
  };

  const key = foodType.toLowerCase().replace(" & ", "_").replace("s", "");
  const co2ePerKg = co2eValues[key] || co2eValues.other;

  return (weightGrams / 1000) * co2ePerKg;
}
