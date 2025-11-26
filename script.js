// Modern Wallet App for Srinath Kishore
// Data storage and initialization
let wallets = JSON.parse(localStorage.getItem('wallets')) || [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let editingWalletId = null;
let editingTransactionId = null;
let deleteType = null;
let deleteId = null;

// DOM Elements
const walletsContainer = document.getElementById('wallets-container');
const noWalletsMessage = document.getElementById('no-wallets-message');
const recentTransactions = document.getElementById('recent-transactions');
const allTransactions = document.getElementById('all-transactions');
const totalBalance = document.getElementById('total-balance');
const balanceChange = document.getElementById('balance-change');

// Modals
const walletModal = document.getElementById('wallet-modal');
const transactionModal = document.getElementById('transaction-modal');
const deleteModal = document.getElementById('delete-modal');

// Forms
const walletForm = document.getElementById('wallet-form');
const transactionForm = document.getElementById('transaction-form');

// Buttons
const addWalletBtn = document.getElementById('add-wallet-btn');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const mainAddBtn = document.getElementById('main-add-btn');

// =============================================
// PWA SERVICE WORKER REGISTRATION
// =============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        console.log('Registering Service Worker...');
        navigator.serviceWorker.register('./service-worker.js')
            .then(function (registration) {
                console.log('Service Worker registered successfully with scope:', registration.scope);
            })
            .catch(function (error) {
                console.log('Service Worker registration failed:', error);
            });
    });
} else {
    console.warn('Service Workers not supported');
}

// =============================================
// PWA INSTALL PROMPT HANDLING
// =============================================
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installCancel = document.getElementById('install-cancel');
const installConfirm = document.getElementById('install-confirm');

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt fired!');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install prompt
    setTimeout(() => {
        installPrompt.classList.add('active');
    }, 3000);
});

installCancel.addEventListener('click', () => {
    console.log('Install prompt dismissed');
    installPrompt.classList.remove('active');
});

installConfirm.addEventListener('click', async () => {
    if (deferredPrompt) {
        console.log('Triggering install prompt...');
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        // Clear the saved prompt since it can't be used again
        deferredPrompt = null;
        // Hide the install prompt
        installPrompt.classList.remove('active');
    }
});

window.addEventListener('appinstalled', () => {
    console.log('App installed successfully!');
    // Hide the install prompt
    installPrompt.classList.remove('active');
    // Clear the deferredPrompt for safety
    deferredPrompt = null;
});

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Format currency to Indian Rupees with proper formatting
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

/**
 * Format time to HH:MM format
 * @param {Date} date - Date object to extract time from
 * @returns {string} Formatted time string
 */
function formatTime(date) {
    return date.toTimeString().slice(0, 5);
}

/**
 * Update greeting based on time of day
 */
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.getElementById('greeting');
    let greeting = "Good Morning, Srinath!";
    if (hour >= 12 && hour < 18) {
        greeting = "Good Afternoon, Srinath!";
    } else if (hour >= 18) {
        greeting = "Good Evening, Srinath!";
    }
    greetingElement.textContent = greeting;
}

/**
 * Update current date display
 */
function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const currentDate = new Date().toLocaleDateString('en-US', options);
    document.getElementById('current-date').textContent = currentDate;
}

/**
 * Get wallet icon based on wallet type
 * @param {string} type - Wallet type
 * @returns {string} FontAwesome icon name
 */
function getWalletIcon(type) {
    const icons = {
        cash: 'money-bill-wave',
        bank: 'university',
        card: 'credit-card',
        digital: 'mobile-alt',
        savings: 'piggy-bank'
    };
    return icons[type] || 'wallet';
}

/**
 * Get category icon based on category
 * @param {string} category - Transaction category
 * @returns {string} FontAwesome icon name
 */
function getCategoryIcon(category) {
    const icons = {
        food: 'utensils',
        shopping: 'shopping-bag',
        transport: 'bus',
        entertainment: 'film',
        bills: 'file-invoice-dollar',
        health: 'heartbeat',
        'smoke-drink': 'smoking'
    };
    return icons[category] || 'receipt';
}

/**
 * Get category display name
 * @param {string} category - Transaction category
 * @returns {string} Display name for category
 */
function getCategoryName(category) {
    const names = {
        food: 'Food & Dining',
        shopping: 'Shopping',
        transport: 'Transportation',
        entertainment: 'Entertainment',
        bills: 'Bills & Utilities',
        health: 'Health & Medical',
        'smoke-drink': 'Smoke/Drink'
    };
    return names[category] || 'Other';
}

// =============================================
// WALLET MANAGEMENT FUNCTIONS
// =============================================

/**
 * Calculate current wallet balance from initial balance and transactions
 * @param {string} walletId - ID of the wallet
 * @returns {number} Current balance
 */
function calculateWalletBalance(walletId) {
    const walletTransactions = transactions.filter(t => t.walletId === walletId);
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return 0;

    // Start with initial balance and add/subtract transactions
    let balance = wallet.initialBalance || 0;
    walletTransactions.forEach(transaction => {
        if (transaction.type === 'income') {
            balance += transaction.amount;
        } else {
            balance -= transaction.amount;
        }
    });
    return balance;
}

/**
 * Calculate wallet change for current month
 * @param {string} walletId - ID of the wallet
 * @returns {number} Net change for current month
 */
function calculateWalletChange(walletId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const walletTransactions = transactions.filter(t =>
        t.walletId === walletId &&
        new Date(t.date) >= startOfMonth
    );

    return walletTransactions.reduce((total, transaction) => {
        if (transaction.type === 'income') {
            return total + transaction.amount;
        } else {
            return total - transaction.amount;
        }
    }, 0);
}

/**
 * Render all wallets in the wallets grid
 */
function renderWallets() {
    if (wallets.length === 0) {
        noWalletsMessage.style.display = 'block';
        walletsContainer.innerHTML = '';
        walletsContainer.appendChild(noWalletsMessage);
        return;
    }

    noWalletsMessage.style.display = 'none';
    let walletsHTML = '';

    wallets.forEach(wallet => {
        const currentBalance = calculateWalletBalance(wallet.id);
        const walletChange = calculateWalletChange(wallet.id);
        const changeClass = walletChange >= 0 ? 'positive' : 'negative';
        const changeIcon = walletChange >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        const changeText = walletChange >= 0 ? `+${formatCurrency(Math.abs(walletChange))}` : `-${formatCurrency(Math.abs(walletChange))}`;

        walletsHTML += `
            <div class="wallet-card" data-wallet-id="${wallet.id}">
                <div class="wallet-actions">
                    <div class="wallet-action-btn edit-wallet" title="Edit Wallet">
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="wallet-action-btn delete-wallet" title="Delete Wallet">
                        <i class="fas fa-trash"></i>
                    </div>
                </div>
                <div class="wallet-header">
                    <div class="wallet-icon ${wallet.type}">
                        <i class="fas fa-${getWalletIcon(wallet.type)}"></i>
                    </div>
                </div>
                <div class="wallet-name">${wallet.name}</div>
                <div class="wallet-balance">${formatCurrency(currentBalance)}</div>
                <div class="wallet-change ${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    <span>${changeText} this month</span>
                </div>
            </div>
        `;
    });

    walletsContainer.innerHTML = walletsHTML;

    // Add event listeners to wallet action buttons
    document.querySelectorAll('.edit-wallet').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const walletId = this.closest('.wallet-card').getAttribute('data-wallet-id');
            openEditWalletModal(walletId);
        });
    });

    document.querySelectorAll('.delete-wallet').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const walletId = this.closest('.wallet-card').getAttribute('data-wallet-id');
            openDeleteModal('wallet', walletId);
        });
    });

    // Update total balance
    updateTotalBalance();
}

/**
 * Update total balance display
 */
function updateTotalBalance() {
    const total = wallets.reduce((sum, wallet) => sum + calculateWalletBalance(wallet.id), 0);
    totalBalance.textContent = formatCurrency(total);

    // Calculate change from last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthTransactions = transactions.filter(t => new Date(t.date) >= lastMonth && new Date(t.date) < new Date(now.getFullYear(), now.getMonth(), 1));
    const lastMonthNet = lastMonthTransactions.reduce((total, transaction) => {
        if (transaction.type === 'income') {
            return total + transaction.amount;
        } else {
            return total - transaction.amount;
        }
    }, 0);

    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTransactions = transactions.filter(t => new Date(t.date) >= currentMonth);
    const currentMonthNet = currentMonthTransactions.reduce((total, transaction) => {
        if (transaction.type === 'income') {
            return total + transaction.amount;
        } else {
            return total - transaction.amount;
        }
    }, 0);

    if (lastMonthNet === 0) {
        if (currentMonthNet > 0) {
            balanceChange.innerHTML = `<i class="fas fa-arrow-up"></i><span>+${formatCurrency(currentMonthNet)} from last month</span>`;
            balanceChange.className = 'balance-change positive';
        } else if (currentMonthNet < 0) {
            balanceChange.innerHTML = `<i class="fas fa-arrow-down"></i><span>-${formatCurrency(Math.abs(currentMonthNet))} from last month</span>`;
            balanceChange.className = 'balance-change negative';
        } else {
            balanceChange.innerHTML = `<i class="fas fa-minus"></i><span>No change from last month</span>`;
            balanceChange.className = 'balance-change';
        }
    } else {
        const percentageChange = ((currentMonthNet - lastMonthNet) / Math.abs(lastMonthNet)) * 100;
        if (percentageChange > 0) {
            balanceChange.innerHTML = `<i class="fas fa-arrow-up"></i><span>+${percentageChange.toFixed(1)}% from last month</span>`;
            balanceChange.className = 'balance-change positive';
        } else if (percentageChange < 0) {
            balanceChange.innerHTML = `<i class="fas fa-arrow-down"></i><span>${percentageChange.toFixed(1)}% from last month</span>`;
            balanceChange.className = 'balance-change negative';
        } else {
            balanceChange.innerHTML = `<i class="fas fa-minus"></i><span>No change from last month</span>`;
            balanceChange.className = 'balance-change';
        }
    }
}

// =============================================
// TRANSACTION MANAGEMENT FUNCTIONS
// =============================================

/**
 * Render transactions in the specified container
 * @param {HTMLElement} container - DOM element to render transactions in
 * @param {Array} transactionsList - List of transactions to render
 * @param {boolean} isRecent - Whether this is the recent transactions list
 */
function renderTransactionList(container, transactionsList, isRecent) {
    if (transactionsList.length === 0) {
        container.innerHTML = `
            <div class="no-wallets">
                <i class="fas fa-receipt"></i>
                <p>No transactions yet. Add your first transaction!</p>
            </div>
        `;
        return;
    }

    let transactionsHTML = '';
    transactionsList.forEach(transaction => {
        const wallet = wallets.find(w => w.id === transaction.walletId);
        const walletName = wallet ? wallet.name : 'Unknown Wallet';
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        const date = new Date(transaction.date);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        transactionsHTML += `
            <div class="transaction-item" data-transaction-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-icon">
                        <i class="fas fa-${getCategoryIcon(transaction.category)}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.comment || getCategoryName(transaction.category)}</h4>
                        <p>${walletName} • ${formattedDate}</p>
                        <div class="transaction-time">${transaction.time}</div>
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}${formatCurrency(transaction.amount)}
                </div>
                ${!isRecent ? `
                <div class="transaction-actions">
                    <div class="transaction-action-btn edit-transaction" title="Edit Transaction">
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="transaction-action-btn delete-transaction" title="Delete Transaction">
                        <i class="fas fa-trash"></i>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = transactionsHTML;

    // Add event listeners to transaction action buttons (for all transactions only)
    if (!isRecent) {
        document.querySelectorAll('.edit-transaction').forEach(btn => {
            btn.addEventListener('click', function () {
                const transactionId = this.closest('.transaction-item').getAttribute('data-transaction-id');
                openEditTransactionModal(transactionId);
            });
        });

        document.querySelectorAll('.delete-transaction').forEach(btn => {
            btn.addEventListener('click', function () {
                const transactionId = this.closest('.transaction-item').getAttribute('data-transaction-id');
                openDeleteModal('transaction', transactionId);
            });
        });
    }
}

/**
 * Render all transactions (recent and all transactions)
 */
function renderTransactions() {
    // Sort transactions by date and time (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateB - dateA;
    });

    // Recent transactions (last 5)
    const recent = sortedTransactions.slice(0, 5);
    renderTransactionList(recentTransactions, recent, true);

    // All transactions
    renderTransactionList(allTransactions, sortedTransactions, false);

    // Update wallet dropdown in transaction form
    updateWalletDropdown();
}

/**
 * Update wallet dropdown in transaction form
 */
function updateWalletDropdown() {
    const walletSelect = document.getElementById('transaction-wallet');
    walletSelect.innerHTML = '<option value="">Select a wallet</option>';
    wallets.forEach(wallet => {
        const option = document.createElement('option');
        option.value = wallet.id;
        option.textContent = wallet.name;
        walletSelect.appendChild(option);
    });
}

// =============================================
// ANALYTICS FUNCTIONS
// =============================================

/**
 * Update analytics and charts with current data
 */
function updateAnalytics() {
    if (transactions.length === 0) {
        return;
    }

    // Calculate totals
    const totalSpending = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    // Update UI
    document.getElementById('total-spending').textContent = formatCurrency(totalSpending);
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);

    // Calculate savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome * 100) : 0;
    document.getElementById('savings-rate').textContent = `${savingsRate.toFixed(1)}%`;

    // Find top spending category
    const categorySpending = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
        });

    let topCategory = '-';
    let topCategoryAmount = 0;
    for (const [category, amount] of Object.entries(categorySpending)) {
        if (amount > topCategoryAmount) {
            topCategory = getCategoryName(category);
            topCategoryAmount = amount;
        }
    }

    document.getElementById('top-category').textContent = topCategory;
    document.getElementById('top-category-amount').textContent = formatCurrency(topCategoryAmount);

    // Update chart placeholders with some basic info
    if (totalSpending > 0) {
        document.getElementById('category-chart').innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-chart-pie" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Spending by Category</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">Total: ${formatCurrency(totalSpending)}</p>
            </div>
        `;
    }

    if (wallets.length > 0) {
        document.getElementById('wallet-chart').innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-chart-bar" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Wallet Distribution</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">${wallets.length} wallets</p>
            </div>
        `;
    }
}

// =============================================
// MODAL MANAGEMENT FUNCTIONS
// =============================================

/**
 * Open add wallet modal
 */
function openAddWalletModal() {
    editingWalletId = null;
    document.getElementById('wallet-modal-title').textContent = 'Add New Wallet';
    document.getElementById('wallet-form').reset();
    walletModal.classList.add('active');
}

/**
 * Open edit wallet modal
 * @param {string} walletId - ID of wallet to edit
 */
function openEditWalletModal(walletId) {
    editingWalletId = walletId;
    const wallet = wallets.find(w => w.id === walletId);
    if (wallet) {
        document.getElementById('wallet-modal-title').textContent = 'Edit Wallet';
        document.getElementById('wallet-id').value = wallet.id;
        document.getElementById('wallet-name').value = wallet.name;
        document.getElementById('wallet-type').value = wallet.type;
        document.getElementById('initial-balance').value = wallet.initialBalance;
        walletModal.classList.add('active');
    }
}

/**
 * Close wallet modal
 */
function closeWalletModal() {
    walletModal.classList.remove('active');
}

/**
 * Handle wallet form submission
 * @param {Event} e - Form submission event
 */
function handleWalletFormSubmit(e) {
    e.preventDefault();

    const walletId = document.getElementById('wallet-id').value;
    const name = document.getElementById('wallet-name').value;
    const type = document.getElementById('wallet-type').value;
    const initialBalance = parseFloat(document.getElementById('initial-balance').value);

    if (editingWalletId) {
        // Update existing wallet - preserve initial balance
        const walletIndex = wallets.findIndex(w => w.id === editingWalletId);
        if (walletIndex !== -1) {
            wallets[walletIndex].name = name;
            wallets[walletIndex].type = type;
            wallets[walletIndex].initialBalance = initialBalance;
        }
    } else {
        // Add new wallet
        const newWallet = {
            id: Date.now().toString(),
            name,
            type,
            initialBalance
        };
        wallets.push(newWallet);
    }

    saveData();
    renderWallets();
    updateWalletDropdown();
    closeWalletModal();
}

/**
 * Open add transaction modal
 */
function openAddTransactionModal() {
    if (wallets.length === 0) {
        alert('Please add a wallet first before creating transactions.');
        return;
    }

    editingTransactionId = null;
    document.getElementById('transaction-modal-title').textContent = 'Add New Transaction';
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-date').valueAsDate = new Date();
    document.getElementById('transaction-time').value = formatTime(new Date());

    // Clear category selection
    document.querySelectorAll('.category-item').forEach(item => item.classList.remove('selected'));
    document.getElementById('transaction-category').value = '';

    transactionModal.classList.add('active');
}

/**
 * Open edit transaction modal
 * @param {string} transactionId - ID of transaction to edit
 */
function openEditTransactionModal(transactionId) {
    editingTransactionId = transactionId;
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
        document.getElementById('transaction-modal-title').textContent = 'Edit Transaction';
        document.getElementById('transaction-id').value = transaction.id;
        document.getElementById('transaction-type').value = transaction.type;
        document.getElementById('transaction-amount').value = transaction.amount;
        document.getElementById('transaction-wallet').value = transaction.walletId;
        document.getElementById('transaction-date').value = transaction.date;
        document.getElementById('transaction-time').value = transaction.time;
        document.getElementById('transaction-comment').value = transaction.comment || '';

        // Select category
        document.querySelectorAll('.category-item').forEach(item => {
            if (item.getAttribute('data-category') === transaction.category) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        document.getElementById('transaction-category').value = transaction.category;

        transactionModal.classList.add('active');
    }
}

/**
 * Close transaction modal
 */
function closeTransactionModal() {
    transactionModal.classList.remove('active');
}

/**
 * Handle transaction form submission
 * @param {Event} e - Form submission event
 */
function handleTransactionFormSubmit(e) {
    e.preventDefault();

    if (!document.getElementById('transaction-category').value) {
        alert('Please select a category');
        return;
    }

    const transactionId = document.getElementById('transaction-id').value;
    const type = document.getElementById('transaction-type').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const walletId = document.getElementById('transaction-wallet').value;
    const category = document.getElementById('transaction-category').value;
    const date = document.getElementById('transaction-date').value;
    const time = document.getElementById('transaction-time').value;
    const comment = document.getElementById('transaction-comment').value;

    // Find the wallet
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) {
        alert('Selected wallet not found');
        return;
    }

    if (editingTransactionId) {
        // Update existing transaction - no need to modify wallet balance
        const transactionIndex = transactions.findIndex(t => t.id === editingTransactionId);
        if (transactionIndex !== -1) {
            transactions[transactionIndex] = {
                ...transactions[transactionIndex],
                type,
                amount,
                walletId,
                category,
                date,
                time,
                comment
            };
        }
    } else {
        // Add new transaction - no need to modify wallet balance
        const newTransaction = {
            id: Date.now().toString(),
            type,
            amount,
            walletId,
            category,
            date,
            time,
            comment
        };
        transactions.push(newTransaction);
    }

    saveData();
    renderWallets(); // This will recalculate balances based on transactions
    renderTransactions();
    updateAnalytics();
    closeTransactionModal();
}

/**
 * Open delete confirmation modal
 * @param {string} type - Type of item to delete ('wallet' or 'transaction')
 * @param {string} id - ID of item to delete
 */
function openDeleteModal(type, id) {
    deleteType = type;
    deleteId = id;
    let message = '';

    if (type === 'wallet') {
        const wallet = wallets.find(w => w.id === id);
        message = `Are you sure you want to delete the wallet "${wallet.name}"? This will also delete all transactions associated with this wallet.`;
    } else if (type === 'transaction') {
        message = 'Are you sure you want to delete this transaction?';
    }

    document.getElementById('delete-message').textContent = message;
    deleteModal.classList.add('active');
}

/**
 * Close delete confirmation modal
 */
function closeDeleteModal() {
    deleteModal.classList.remove('active');
}

/**
 * Confirm and execute deletion
 */
function confirmDelete() {
    if (deleteType === 'wallet') {
        // Delete wallet and its transactions
        wallets = wallets.filter(w => w.id !== deleteId);
        transactions = transactions.filter(t => t.walletId !== deleteId);
    } else if (deleteType === 'transaction') {
        // Delete transaction - no need to modify wallet balance
        transactions = transactions.filter(t => t.id !== deleteId);
    }

    saveData();
    renderWallets(); // This will recalculate all balances
    renderTransactions();
    updateAnalytics();
    closeDeleteModal();
}

// =============================================
// EVENT HANDLERS AND INITIALIZATION
// =============================================

/**
 * Handle main add button click based on current section
 */
function handleMainAddButton() {
    const activeSection = document.querySelector('.section.active').id;
    if (activeSection === 'wallets-section') {
        openAddWalletModal();
    } else if (activeSection === 'transactions-section') {
        openAddTransactionModal();
    } else {
        // For analytics section, default to adding transaction
        openAddTransactionModal();
    }
}

/**
 * Save data to localStorage
 */
function saveData() {
    localStorage.setItem('wallets', JSON.stringify(wallets));
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

/**
 * Initialize the application
 */
function initializeApp() {
    updateGreeting();
    updateDate();
    renderWallets();
    renderTransactions();
    updateAnalytics();

    // Set today's date and current time as default in transaction form
    const now = new Date();
    document.getElementById('transaction-date').valueAsDate = now;
    document.getElementById('transaction-time').value = formatTime(now);

    // Event listeners
    addWalletBtn.addEventListener('click', openAddWalletModal);
    addTransactionBtn.addEventListener('click', openAddTransactionModal);
    mainAddBtn.addEventListener('click', handleMainAddButton);

    walletForm.addEventListener('submit', handleWalletFormSubmit);
    transactionForm.addEventListener('submit', handleTransactionFormSubmit);

    document.getElementById('close-wallet-modal').addEventListener('click', closeWalletModal);
    document.getElementById('close-transaction-modal').addEventListener('click', closeTransactionModal);
    document.getElementById('close-delete-modal').addEventListener('click', closeDeleteModal);
    document.getElementById('cancel-wallet').addEventListener('click', closeWalletModal);
    document.getElementById('cancel-transaction').addEventListener('click', closeTransactionModal);
    document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete').addEventListener('click', confirmDelete);

    // Category selection
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.category-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('transaction-category').value = this.getAttribute('data-category');
        });
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            // Add active class to clicked nav item
            this.classList.add('active');

            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });

            // Show the selected section
            const sectionId = this.getAttribute('data-section');
            if (sectionId) {
                document.getElementById(sectionId).classList.add('active');
            }
        });
    });

    // View all transactions
    document.getElementById('view-all-transactions').addEventListener('click', function () {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-section="transactions-section"]').classList.add('active');
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById('transactions-section').classList.add('active');
    });

    console.log('FinTrack app initialized. Check console for PWA logs.');
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);