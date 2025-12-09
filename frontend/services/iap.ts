import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Product IDs - must match Google Play Console
const PRODUCT_IDS = {
  PERSONA_SINGLE: 'persona_single',
  PERSONA_ALL: 'persona_all',
};

const SUBSCRIPTION_IDS = {
  PERSONA_UNLIMITED: 'persona_unlimited',
};

class IAPService {
  private purchaseUpdateSubscription: any;
  private purchaseErrorSubscription: any;
  private connected: boolean = false;

  async initialize() {
    try {
      await initConnection();
      this.connected = true;
      console.log('IAP Connection initialized');

      // Setup listeners
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        async (purchase: Purchase) => {
          console.log('Purchase updated:', purchase);
          await this.handlePurchase(purchase);
        }
      );

      this.purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          console.warn('Purchase error:', error);
        }
      );

      return true;
    } catch (error) {
      console.error('IAP initialization error:', error);
      return false;
    }
  }

  async getAvailableProducts() {
    try {
      const products = await getProducts({
        skus: [PRODUCT_IDS.PERSONA_SINGLE, PRODUCT_IDS.PERSONA_ALL],
      });
      console.log('Available products:', products);
      return products;
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  async getAvailableSubscriptions() {
    try {
      const subscriptions = await getProducts({
        skus: [SUBSCRIPTION_IDS.PERSONA_UNLIMITED],
      });
      console.log('Available subscriptions:', subscriptions);
      return subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  async purchaseProduct(productId: string) {
    try {
      await requestPurchase({ sku: productId });
    } catch (error) {
      console.error('Purchase request error:', error);
      throw error;
    }
  }

  async handlePurchase(purchase: Purchase) {
    try {
      // Validate purchase with backend
      const response = await axios.post(`${BACKEND_URL}/api/purchase/validate`, {
        product_id: purchase.productId,
        purchase_token: purchase.purchaseToken,
        user_id: null, // Add user ID if you have user system
      });

      if (response.data.valid) {
        // Finish transaction
        await finishTransaction({ purchase, isConsumable: false });
        console.log('Purchase validated and finished');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error handling purchase:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }
    if (this.connected) {
      await endConnection();
      this.connected = false;
    }
  }
}

export const iapService = new IAPService();
export { PRODUCT_IDS, SUBSCRIPTION_IDS };
