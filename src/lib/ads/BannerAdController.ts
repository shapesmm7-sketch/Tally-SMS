export class BannerAdController {
  static readonly PROD_AD_UNIT_ID = 'ca-app-pub-8582659585800553/9814848244';

  static getAdUnitId(): string {
    return this.PROD_AD_UNIT_ID;
  }

  static getBannerConfig() {
    return {
      adId: this.getAdUnitId(),
      adSize: 'BANNER',
      position: 'BOTTOM_CENTER',
      margin: 0,
      isTesting: false
    };
  }
}
