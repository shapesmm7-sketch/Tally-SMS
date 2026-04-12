export class NativeAdController {
  static readonly TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/2247696110';
  static readonly PROD_AD_UNIT_ID = 'YOUR_PROD_NATIVE_AD_UNIT_ID';

  static getAdUnitId(isProduction: boolean = false): string {
    return isProduction ? this.PROD_AD_UNIT_ID : this.TEST_AD_UNIT_ID;
  }
}
