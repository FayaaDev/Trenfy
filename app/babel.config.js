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
            'mdi:filter-variant',
            'mdi:bookmark-multiple',
            'mdi:share-variant',
            'mdi:bookmark',
            'mdi:bookmark-outline',
            'material-symbols:arrow-back-rounded',
            'material-symbols:close-rounded',
            'material-symbols:open-in-new-rounded',
          ],
        },
      ],
    ],
  };
};
