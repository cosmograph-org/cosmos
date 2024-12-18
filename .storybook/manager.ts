import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';
 
const theme = create({
  base: 'dark',
  brandTitle: 'Cosmos',
  brandUrl: 'https://cosmograph.app',
  brandImage: 'https://github.com/user-attachments/assets/f1d7540e-7791-4c5c-9804-65b9d45acd7e',
  brandTarget: '_self',
});

addons.setConfig({
  theme,
});