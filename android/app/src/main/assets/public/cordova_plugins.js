
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
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
      "cordova-plugin-sms": "1.0.5"
    };
    // BOTTOM OF METADATA
    });
    