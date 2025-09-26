// AfterSchool Clicker - Shop System
class ShopSystem {
    constructor() {
        this.clickItemsContainer = null;
        this.cpsItemsContainer = null;
        this.items = {
            click: [],
            cps: []
        };

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
        this.clickItemsContainer = document.getElementById('click-items');
        this.cpsItemsContainer = document.getElementById('cps-items');

        // Wait for data manager to load
        if (window.dataManager) {
            await window.dataManager.loadAll();
            this.loadItems();
            this.renderShop();
            this.setupEventListeners();
        }
    }

    loadItems() {
        // Load items from data manager
        this.items.click = window.dataManager.getClickItems();
        this.items.cps = window.dataManager.getCPSItems();

        console.log('Loaded shop items:', this.items);
    }

    renderShop() {
        this.renderClickItems();
        this.renderCPSItems();
    }

    renderClickItems() {
        if (!this.clickItemsContainer) return;

        this.clickItemsContainer.innerHTML = '';

        this.items.click.forEach(item => {
            const itemElement = this.createItemElement(item);
            this.clickItemsContainer.appendChild(itemElement);
        });
    }

    renderCPSItems() {
        if (!this.cpsItemsContainer) return;

        this.cpsItemsContainer.innerHTML = '';

        this.items.cps.forEach(item => {
            const itemElement = this.createItemElement(item);
            this.cpsItemsContainer.appendChild(itemElement);
        });
    }

    createItemElement(item) {
        const cost = parseInt(item.cost);
        const owned = window.gameState.get(`purchases.items.${item.id}`) || 0;
        const canAfford = window.gameState.canAfford(cost);

        const itemDiv = document.createElement('div');
        itemDiv.className = `shop-item ${canAfford ? '' : 'disabled'}`;
        itemDiv.dataset.itemId = item.id;

        itemDiv.innerHTML = `
            <div class="item-header">
                <div class="item-name">${item.name}</div>
                <div class="item-cost">${this.formatNumber(cost)}</div>
            </div>
            <div class="item-description">${item.desc}</div>
            ${owned > 0 ? `<div class="item-owned">所持数: ${owned}</div>` : ''}
        `;

        // Add click handler
        itemDiv.addEventListener('click', () => this.purchaseItem(item));

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

        const item = this.getItemById(itemId);
        const cost = parseInt(item.cost);
        const owned = window.gameState.get(`purchases.items.${itemId}`) || 0;
        const canAfford = window.gameState.canAfford(cost);

        // Update affordability
        itemElement.className = `shop-item ${canAfford ? '' : 'disabled'}`;

        // Update owned count
        const ownedElement = itemElement.querySelector('.item-owned');
        if (owned > 0) {
            if (ownedElement) {
                ownedElement.textContent = `所持数: ${owned}`;
            } else {
                const ownedDiv = document.createElement('div');
                ownedDiv.className = 'item-owned';
                ownedDiv.textContent = `所持数: ${owned}`;
                itemElement.appendChild(ownedDiv);
            }
        }
    }

    updateAllItemsAffordability() {
        // Update all items' affordability status
        [...this.items.click, ...this.items.cps].forEach(item => {
            this.updateItemDisplay(item.id);
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

    setupEventListeners() {
        // Listen for game state changes to update affordability
        window.gameState.addListener('gameProgress.currentPoints', () => {
            this.updateAllItemsAffordability();
        });

        // Listen for purchases to update displays
        window.gameState.addListener('purchases.items.*', () => {
            this.updatePointsDisplay();
            this.updatePPSDisplay();
        });
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
}

// Initialize shop system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.shopSystem = new ShopSystem();
});