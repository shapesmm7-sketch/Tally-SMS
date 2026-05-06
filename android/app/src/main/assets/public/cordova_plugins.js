
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "cordova-plugin-purchase.CdvPurchase",
          "file": "plugins/cordova-plugin-purchase/www/store.js",
          "pluginId": "cordova-plugin-purchase",
        "clobbers": [
          "store",
          "CdvPurchase"
        ]
        },
      {
          "id": "cordova-plugin-sms.SMS",
          "file": "plugins/cordova-plugin-sms/www/SMS.js",
          "pluginId": "cordova-plugin-sms",
        "clobbers": [
          "window.SMS"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "cordova-plugin-purchase": "13.15.3",
      "cordova-plugin-sms": "1.0.5"
    };
    // BOTTOM OF METADATA
    });
    