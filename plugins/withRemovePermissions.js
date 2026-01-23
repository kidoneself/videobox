const { withAndroidManifest } = require('@expo/config-plugins');

const withRemovePermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest['uses-permission']) {
      return config;
    }

    // 要移除的权限列表（只删除录音权限，保留存储权限用于导入文件）
    const permissionsToRemove = [
      'android.permission.RECORD_AUDIO',
      // 不删除存储权限，因为 Android 9 及以下需要用于导入文件
      // 'android.permission.READ_EXTERNAL_STORAGE',
      // 'android.permission.WRITE_EXTERNAL_STORAGE',
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
