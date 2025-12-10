// Mock analytics for Expo Go - will use real Firebase in production build
class AnalyticsService {
  async logScreenView(screenName: string, screenClass?: string) {
    try {
      console.log(`Analytics: Screen view logged - ${screenName}`);
      // In production build with Firebase: analytics().logScreenView()
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }

  async logEvent(eventName: string, params?: { [key: string]: any }) {
    try {
      console.log(`Analytics: Event logged - ${eventName}`, params);
      // In production build with Firebase: analytics().logEvent()
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
    console.log(`Analytics: Purchase logged - ${productId}, ${value} ${currency}`);
    await this.logEvent('purchase_success', { product_id: productId });
  }

  async logShareAction(personaId: string, platform: string) {
    console.log(`Analytics: Share logged - ${personaId} on ${platform}`);
    await this.logEvent('share_action', { persona_id: personaId, platform });
  }

  async logLanguageChange(from: string, to: string) {
    await this.logEvent('language_change', { from, to });
  }
}

export const analyticsService = new AnalyticsService();
