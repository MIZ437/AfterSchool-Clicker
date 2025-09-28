// AfterSchool Clicker - Shop System
console.log('=== ShopSystem.js loading ===');

class ShopSystem {
    constructor() {
        console.log('ShopSystem: Constructor called');
        this.clickItemsContainer = null;
        this.cpsItemsContainer = null;
        this.items = {
            click: [],
            cps: []
        };
        this.listeners = []; // Track listeners for cleanup

        this.setupShop();
    }

    setupShop() {
        // Wait for DOM and data to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
    }

    async initializeElements() {
        console.log('ShopSystem: Initializing elements...');

        this.clickItemsContainer = document.getElementById('click-items');
        this.cpsItemsContainer = document.getElementById('cps-items');

        console.log('ShopSystem: Containers found:', {
            clickItems: !!this.clickItemsContainer,
            cpsItems: !!this.cpsItemsContainer
        });

        // Setup shop sub-tabs
        this.setupShopTabs();

        // Wait for data manager to load
        if (window.dataManager) {
            console.log('ShopSystem: DataManager found, loading data...');
            await window.dataManager.loadAll();
            this.loadItems();
            this.renderShop();
            this.setupEventListeners();

            // Initial affordability check after everything is loaded
            setTimeout(() => {
                this.updateAllItemsAffordability();
            }, 100);

            // Force update after a longer delay to ensure GameState is fully initialized
            setTimeout(() => {
                console.log('ShopSystem: Force updating affordability after GameState initialization');
                this.updateAllItemsAffordability();
            }, 500);
        } else {
            console.error('ShopSystem: DataManager not found!');
        }
    }

    async loadItems() {
        // Ensure DataManager is available
        if (!window.dataManager) {
            console.error('ShopSystem: DataManager not available, waiting...');

            // Wait for DataManager
            let attempts = 0;
            while (!window.dataManager && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.dataManager) {
                console.error('ShopSystem: DataManager not available after waiting, using fallback');
                this.loadFallbackItems();
                return;
            }
        }

        // Load items from data manager
        try {
            // Ensure data is loaded
            if (window.dataManager.loadAll) {
                await window.dataManager.loadAll();
            }

            this.items.click = window.dataManager.getClickItems() || [];
            this.items.cps = window.dataManager.getCPSItems() || [];

            console.log('ShopSystem: Loaded shop items:', this.items);

            // Validate items
            if (this.items.click.length === 0 && this.items.cps.length === 0) {
                console.warn('ShopSystem: No shop items loaded, using fallback data');
                this.loadFallbackItems();
            }
        } catch (error) {
            console.error('ShopSystem: Failed to load shop items:', error);
            this.loadFallbackItems();
        }
    }

    loadFallbackItems() {
        // Fallback shop items
        this.items.click = [
            { id: 'CLICK_1', name: 'クリック強化', effect: 'click', value: '1', cost: '50', desc: '1クリック: +1ポイント' },
            { id: 'CLICK_2', name: 'ダブルクリック', effect: 'click', value: '2', cost: '200', desc: '1クリック: +2ポイント' }
        ];
        this.items.cps = [
            { id: 'CPS_1', name: '自動クリック', effect: 'cps', value: '1', cost: '100', desc: '毎秒 +1ポイント' }
        ];
        console.log('Using fallback shop items:', this.items);
    }

    renderShop() {
        console.log('ShopSystem: Rendering shop...');
        this.renderClickItems();
        this.renderCPSItems();
    }

    renderClickItems() {
        console.log('ShopSystem: Rendering click items...', {
            container: !!this.clickItemsContainer,
            itemCount: this.items.click ? this.items.click.length : 0,
            items: this.items.click
        });

        if (!this.clickItemsContainer) {
            console.error('ShopSystem: Click items container not found!');
            return;
        }

        this.clickItemsContainer.innerHTML = '';

        this.items.click.forEach((item, index) => {
            console.log(`ShopSystem: Creating click item ${index}:`, item);
            const itemElement = this.createItemElement(item);
            this.clickItemsContainer.appendChild(itemElement);
        });

        console.log('ShopSystem: Click items rendered, container children:', this.clickItemsContainer.children.length);
    }

    renderCPSItems() {
        console.log('ShopSystem: Rendering CPS items...', {
            container: !!this.cpsItemsContainer,
            itemCount: this.items.cps ? this.items.cps.length : 0,
            items: this.items.cps
        });

        if (!this.cpsItemsContainer) {
            console.error('ShopSystem: CPS items container not found!');
            return;
        }

        this.cpsItemsContainer.innerHTML = '';

        this.items.cps.forEach((item, index) => {
            console.log(`ShopSystem: Creating CPS item ${index}:`, item);
            const itemElement = this.createItemElement(item);
            this.cpsItemsContainer.appendChild(itemElement);
        });

        console.log('ShopSystem: CPS items rendered, container children:', this.cpsItemsContainer.children.length);
    }

    createItemElement(item) {
        const cost = parseInt(item.cost);
        const value = parseInt(item.value);

        // Ensure GameState exists and is properly initialized
        if (!window.gameState) {
            console.error('ShopSystem: GameState not available when creating item element');
            // Return a basic disabled element that will be refreshed later
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item disabled';
            itemDiv.dataset.itemId = item.id;
            itemDiv.innerHTML = `
                <div class="item-header">
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-effect">Loading...</div>
                    </div>
                    <div class="item-cost">
                        <span class="cost-amount">${this.formatNumber(cost)}</span>
                        <span class="cost-unit">ポイント</span>
                    </div>
                </div>
                <div class="item-description">${item.desc}</div>
                <div class="item-action">
                    <button class="purchase-btn disabled">読み込み中...</button>
                </div>
            `;
            return itemDiv;
        }

        // Double-check GameState methods are available
        let owned = 0;
        let currentPoints = 0;
        let canAfford = false;

        try {
            owned = window.gameState.get(`purchases.items.${item.id}`) || 0;
            currentPoints = window.gameState.get('gameProgress.currentPoints') || 0;

            // Check debug mode for affordability
            const debugMode = window.gameState.isDebugMode();
            if (debugMode) {
                canAfford = true; // Debug mode: everything is affordable
                console.log(`ShopSystem: Debug mode active - item ${item.id} is affordable`);
            } else {
                canAfford = currentPoints >= cost;
            }
        } catch (error) {
            console.error('ShopSystem: Error accessing GameState:', error);
            // Use safe defaults
            owned = 0;
            currentPoints = 0;
            canAfford = false;
        }

        console.log(`ShopSystem: Creating item ${item.id}:`, {
            cost,
            currentPoints,
            canAfford,
            gameStateExists: !!window.gameState
        });

        const itemDiv = document.createElement('div');
        itemDiv.className = `shop-item ${canAfford ? '' : 'disabled'}`;
        itemDiv.dataset.itemId = item.id;

        // Create effect description
        const effectText = item.effect === 'click'
            ? `クリック +${value}ポイント`
            : `毎秒 +${value}ポイント`;

        itemDiv.innerHTML = `
            <div class="item-header">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-effect">${effectText}</div>
                </div>
                <div class="item-cost">
                    <span class="cost-amount">${this.formatNumber(cost)}</span>
                    <span class="cost-unit">ポイント</span>
                </div>
            </div>
            <div class="item-description">${item.desc}</div>
            ${owned > 0 ? `<div class="item-owned">所持数: ${owned}個</div>` : ''}
            <div class="item-action">
                <button class="purchase-btn ${canAfford ? '' : 'disabled'}">
                    ${canAfford ? '購入' : 'ポイント不足'}
                </button>
            </div>
        `;

        // Add click handler to purchase button
        const purchaseBtn = itemDiv.querySelector('.purchase-btn');
        if (purchaseBtn) {
            console.log(`ShopSystem: Adding click handler for ${item.id}, button found:`, !!purchaseBtn);
            purchaseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`ShopSystem: Purchase button clicked for ${item.id}, disabled:`, purchaseBtn.classList.contains('disabled'));
                if (!purchaseBtn.classList.contains('disabled')) {
                    this.purchaseItem(item);
                }
            });
        } else {
            console.error(`ShopSystem: Purchase button not found for item ${item.id}`);
        }

        return itemDiv;
    }

    purchaseItem(item) {
        const cost = parseInt(item.cost);
        const effect = item.effect;
        const value = parseInt(item.value);

        // Check if player can afford the item
        if (!window.gameState.canAfford(cost)) {
            this.showPurchaseResult(false, 'ポイントが不足しています');
            return;
        }

        // Spend points
        const success = window.gameState.spendPoints(cost);

        if (success) {
            // Add item to purchases and apply effect
            window.gameState.purchaseItem(item.id, effect, value);

            // Play purchase sound
            if (window.audioManager) {
                window.audioManager.playSE('purchase_sound');
            }

            // Show success message
            this.showPurchaseResult(true, `${item.name}を購入しました！`);

            // Update shop display
            this.updateItemDisplay(item.id);
            this.updatePointsDisplay();

            // Update click value display if it's a click item
            if (effect === 'click') {
                this.updateClickValueDisplay();
            }

            // Update PPS display if it's a CPS item
            if (effect === 'cps') {
                this.updatePPSDisplay();
            }

            console.log(`Purchased ${item.name} for ${cost} points`);
        } else {
            this.showPurchaseResult(false, '購入に失敗しました');
        }
    }

    updateItemDisplay(itemId) {
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        if (!itemElement) return;

        // Check GameState availability
        if (!window.gameState) {
            console.warn(`ShopSystem: GameState not available for updating item ${itemId}`);
            return;
        }

        const item = this.getItemById(itemId);
        if (!item) {
            console.error(`ShopSystem: Item ${itemId} not found`);
            return;
        }

        const cost = parseInt(item.cost);
        let owned = 0;
        let canAfford = false;

        try {
            owned = window.gameState.get(`purchases.items.${itemId}`) || 0;

            // Check debug mode for affordability
            const debugMode = window.gameState.isDebugMode();
            if (debugMode) {
                canAfford = true; // Debug mode: everything is affordable
            } else {
                canAfford = window.gameState.canAfford(cost);
            }
        } catch (error) {
            console.error(`ShopSystem: Error accessing GameState for item ${itemId}:`, error);
            return;
        }

        // Update affordability
        itemElement.className = `shop-item ${canAfford ? '' : 'disabled'}`;

        // Update purchase button
        const purchaseBtn = itemElement.querySelector('.purchase-btn');
        if (purchaseBtn) {
            purchaseBtn.className = `purchase-btn ${canAfford ? '' : 'disabled'}`;
            purchaseBtn.textContent = canAfford ? '購入' : 'ポイント不足';
        }

        // Update owned count
        const ownedElement = itemElement.querySelector('.item-owned');
        if (owned > 0) {
            if (ownedElement) {
                ownedElement.textContent = `所持数: ${owned}個`;
            } else {
                const ownedDiv = document.createElement('div');
                ownedDiv.className = 'item-owned';
                ownedDiv.textContent = `所持数: ${owned}個`;

                // Insert before the action div
                const actionDiv = itemElement.querySelector('.item-action');
                if (actionDiv) {
                    itemElement.insertBefore(ownedDiv, actionDiv);
                } else {
                    itemElement.appendChild(ownedDiv);
                }
            }
        }
    }

    updateAllItemsAffordability() {
        // Ensure GameState is available before updating
        if (!window.gameState) {
            console.warn('ShopSystem: GameState not available for affordability update, retrying...');
            setTimeout(() => {
                if (window.gameState) {
                    this.updateAllItemsAffordability();
                }
            }, 100);
            return;
        }

        console.log('ShopSystem: Updating affordability for all items');

        // Update all items' affordability status
        [...this.items.click, ...this.items.cps].forEach(item => {
            try {
                this.updateItemDisplay(item.id);
            } catch (error) {
                console.error(`ShopSystem: Failed to update item ${item.id}:`, error);
                // Try to re-render this specific item
                setTimeout(() => {
                    try {
                        const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);
                        if (itemElement && window.gameState) {
                            const newElement = this.createItemElement(item);
                            itemElement.parentNode.replaceChild(newElement, itemElement);
                            console.log(`ShopSystem: Re-rendered item ${item.id}`);
                        }
                    } catch (retryError) {
                        console.error(`ShopSystem: Retry failed for item ${item.id}:`, retryError);
                    }
                }, 200);
            }
        });
    }

    updatePointsDisplay() {
        const currentPointsElement = document.getElementById('current-points');
        if (currentPointsElement) {
            const currentPoints = window.gameState.get('gameProgress.currentPoints');
            currentPointsElement.textContent = this.formatNumber(currentPoints);
        }

        // Update affordability for all items
        this.updateAllItemsAffordability();
    }

    updateClickValueDisplay() {
        // This will be handled by the click system
        if (window.clickSystem) {
            // Trigger any UI updates needed
        }
    }

    updatePPSDisplay() {
        const ppsElement = document.getElementById('points-per-second');
        if (ppsElement) {
            const pps = window.gameState.getPointsPerSecond();
            ppsElement.textContent = this.formatNumber(pps);
        }
    }

    showPurchaseResult(success, message) {
        // Create result popup
        const popup = document.createElement('div');
        popup.className = `purchase-result ${success ? 'success' : 'error'}`;
        popup.textContent = message;
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${success ? '#00b894' : '#e17055'};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 10000;
            animation: popupFade 2s ease-in-out forwards;
        `;

        // Add popup animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes popupFade {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20%, 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(popup);

        // Remove after animation
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 2000);
    }

    getItemById(itemId) {
        const allItems = [...this.items.click, ...this.items.cps];
        return allItems.find(item => item.id === itemId);
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return Math.floor(num).toLocaleString();
    }

    setupShopTabs() {
        const shopTabs = document.querySelectorAll('.shop-tab');
        const shopTabContents = document.querySelectorAll('.shop-tab-content');

        shopTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.shopTab;

                // Remove active class from all tabs and content
                shopTabs.forEach(t => t.classList.remove('active'));
                shopTabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                // Show corresponding content
                const targetContent = document.getElementById(`shop-${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    setupEventListeners() {
        if (!window.gameState) {
            console.error('ShopSystem: Cannot setup listeners - GameState not available');
            return;
        }

        console.log('ShopSystem: Setting up event listeners...');

        // Clear existing listeners first
        this.clearEventListeners();

        // Listen for game state changes to update affordability
        const pointsListener = () => {
            console.log('ShopSystem: Points changed, updating affordability');
            this.updateAllItemsAffordability();
        };
        window.gameState.addListener('gameProgress.currentPoints', pointsListener);
        this.listeners.push({ path: 'gameProgress.currentPoints', callback: pointsListener });

        // Listen for purchases to update displays
        const purchasesListener = () => {
            console.log('ShopSystem: Purchase detected, updating displays');
            this.updatePointsDisplay();
            this.updatePPSDisplay();
        };
        window.gameState.addListener('purchases.items.*', purchasesListener);
        this.listeners.push({ path: 'purchases.items.*', callback: purchasesListener });

        // Listen for game state reset to refresh shop
        const stateChangeListener = (value, oldValue, path) => {
            // Only respond to significant state changes
            if (path === '*' || path.includes('gameProgress') || path.includes('purchases')) {
                console.log('ShopSystem: GameState changed, path:', path);
                setTimeout(() => {
                    this.updateAllItemsAffordability();
                    this.updatePointsDisplay();
                }, 100);
            }
        };
        window.gameState.addListener('*', stateChangeListener);
        this.listeners.push({ path: '*', callback: stateChangeListener });

        // Additional listener specifically for debug mode changes
        const debugModeListener = (value) => {
            console.log('ShopSystem: Debug mode changed to:', value);
            setTimeout(() => {
                this.updateAllItemsAffordability();
            }, 50);
        };
        window.gameState.addListener('settings.debugMode', debugModeListener);
        this.listeners.push({ path: 'settings.debugMode', callback: debugModeListener });

        console.log(`ShopSystem: Setup ${this.listeners.length} event listeners`);
    }

    clearEventListeners() {
        if (window.gameState && this.listeners) {
            console.log(`ShopSystem: Clearing ${this.listeners.length} event listeners`);
            this.listeners.forEach(listener => {
                window.gameState.removeListener(listener.path, listener.callback);
            });
            this.listeners = [];
        }
    }

    // Get shop statistics
    getShopStats() {
        const totalSpent = this.calculateTotalSpent();
        const ownedItems = this.getOwnedItemsCount();
        const totalItems = this.items.click.length + this.items.cps.length;

        return {
            totalSpent,
            ownedItems,
            totalItems,
            completionPercentage: Math.round((ownedItems / totalItems) * 100)
        };
    }

    calculateTotalSpent() {
        let totalSpent = 0;
        const purchases = window.gameState.get('purchases.items') || {};

        Object.entries(purchases).forEach(([itemId, count]) => {
            const item = this.getItemById(itemId);
            if (item) {
                totalSpent += parseInt(item.cost) * count;
            }
        });

        return totalSpent;
    }

    getOwnedItemsCount() {
        const purchases = window.gameState.get('purchases.items') || {};
        return Object.keys(purchases).filter(itemId => purchases[itemId] > 0).length;
    }

    // Refresh shop display
    refresh() {
        this.renderShop();
        this.updatePointsDisplay();
        this.updatePPSDisplay();
    }

    // Force complete refresh of shop system (for save data deletion)
    forceRefresh() {
        console.log('ShopSystem: Force refresh initiated');

        try {
            // Reload items from data manager
            this.loadItems();

            // Re-render everything
            this.renderShop();

            // Update all displays
            this.updatePointsDisplay();
            this.updatePPSDisplay();
            this.updateAllItemsAffordability();

            console.log('ShopSystem: Force refresh completed successfully');
        } catch (error) {
            console.error('ShopSystem: Force refresh failed:', error);

            // Try again after a delay
            setTimeout(() => {
                try {
                    this.loadItems();
                    this.renderShop();
                    this.updateAllItemsAffordability();
                    console.log('ShopSystem: Force refresh retry succeeded');
                } catch (retryError) {
                    console.error('ShopSystem: Force refresh retry failed:', retryError);
                }
            }, 500);
        }
    }

    // Complete system reinitialize (nuclear option for save deletion)
    async completeReinitialize() {
        console.log('ShopSystem: Starting complete reinitialization...');

        try {
            // Clear all existing listeners first
            if (window.gameState && this.listeners) {
                this.listeners.forEach(listener => {
                    window.gameState.removeListener(listener.path, listener.callback);
                });
                this.listeners = [];
            }

            // Reset containers
            this.clickItemsContainer = document.getElementById('click-items');
            this.cpsItemsContainer = document.getElementById('cps-items');

            if (!this.clickItemsContainer || !this.cpsItemsContainer) {
                console.error('ShopSystem: Containers not found during reinitialization');
                return false;
            }

            // Clear containers
            this.clickItemsContainer.innerHTML = '';
            this.cpsItemsContainer.innerHTML = '';

            // Wait for GameState to be ready
            let attempts = 0;
            while ((!window.gameState || typeof window.gameState.get !== 'function') && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 50));
                attempts++;
            }

            if (!window.gameState || typeof window.gameState.get !== 'function') {
                console.error('ShopSystem: GameState not ready after waiting');
                return false;
            }

            // Reload everything from scratch
            await this.loadItems();
            this.setupShopTabs();
            this.renderShop();
            this.setupEventListeners();

            // Force multiple updates
            setTimeout(() => {
                this.updateAllItemsAffordability();
                this.updatePointsDisplay();
                this.updatePPSDisplay();
            }, 100);

            setTimeout(() => {
                this.updateAllItemsAffordability();
            }, 300);

            setTimeout(() => {
                this.updateAllItemsAffordability();
            }, 600);

            console.log('ShopSystem: Complete reinitialization successful');
            return true;

        } catch (error) {
            console.error('ShopSystem: Complete reinitialization failed:', error);
            return false;
        }
    }
}

// Initialize shop system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('ShopSystem: DOMContentLoaded fired, creating ShopSystem');
    window.shopSystem = new ShopSystem();
});

console.log('ShopSystem: Script loaded, DOM state:', document.readyState);