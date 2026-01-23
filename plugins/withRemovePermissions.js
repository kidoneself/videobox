const { withAndroidManifest } = require('@expo/config-plugins');

const withRemovePermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest['uses-permission']) {
      return config;
    }

    // 要移除的权限列表
    const permissionsToRemove = [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.MANAGE_EXTERNAL_STORAGE',
    ];

    // 过滤掉要移除的权限
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (permission) => {
        const name = permission.$['android:name'];
        return !permissionsToRemove.includes(name);
      }
    );

    return config;
  });
};

module.exports = withRemovePermissions;
