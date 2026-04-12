export class BannerAdController {
  // Use test IDs during development
  static readonly TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
  static readonly PROD_AD_UNIT_ID = 'YOUR_PROD_BANNER_AD_UNIT_ID';

  static getAdUnitId(isProduction: boolean = false): string {
    return isProduction ? this.PROD_AD_UNIT_ID : this.TEST_AD_UNIT_ID;
  }

  static getBannerConfig() {
    return {
      adId: this.getAdUnitId(),
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
    };
  }
}
