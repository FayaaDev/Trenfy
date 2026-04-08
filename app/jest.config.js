module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage': require.resolve(
      '@react-native-async-storage/async-storage/jest/async-storage-mock'
    ),
    'expo/src/winter/runtime.native': '<rootDir>/jest.setup.js',
    'expo/build/winter/runtime.native': '<rootDir>/jest.setup.js',
  },
};
