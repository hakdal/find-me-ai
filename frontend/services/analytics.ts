import analytics from '@react-native-firebase/analytics';

class AnalyticsService {
  async logScreenView(screenName: string, screenClass?: string) {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log(`Analytics: Screen view logged - ${screenName}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  async logEvent(eventName: string, params?: { [key: string]: any }) {
    try {
      await analytics().logEvent(eventName, params);
      console.log(`Analytics: Event logged - ${eventName}`, params);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  // Predefined events
  async logQuizComplete(personaTheme: string) {
    await this.logEvent('quiz_complete', { persona_theme: personaTheme });
  }

  async logPersonaGenerated(personaId: string, personaTheme: string) {
    await this.logEvent('persona_generated', {
      persona_id: personaId,
      persona_theme: personaTheme,
    });
  }

  async logPaywallView(trigger: string) {
    await this.logEvent('paywall_view', { trigger });
  }

  async logPurchaseAttempt(productId: string) {
    await this.logEvent('purchase_attempt', { product_id: productId });
  }

  async logPurchaseSuccess(productId: string, value: number, currency: string) {
    await analytics().logPurchase({
      value,
      currency,
      items: [{ item_id: productId, item_name: productId }],
    });
    await this.logEvent('purchase_success', { product_id: productId });
  }

  async logShareAction(personaId: string, platform: string) {
    await analytics().logShare({
      content_type: 'persona',
      item_id: personaId,
      method: platform,
    });
  }

  async logLanguageChange(from: string, to: string) {
    await this.logEvent('language_change', { from, to });
  }
}

export const analyticsService = new AnalyticsService();
