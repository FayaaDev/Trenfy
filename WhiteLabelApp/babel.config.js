module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'react-native-iconify/babel',
        {
          entry: 'App.tsx',
          icons: [
            'streamline-plump:trending-content',
            'si:grid-line',
            'iconamoon:profile-fill',
            'logos:youtube-icon',
            'ri:twitter-x-fill',
            'material-symbols:grid-view-rounded',
            'material-symbols:public',
            'material-symbols:close-rounded',
          ],
        },
      ],
    ],
  };
};
