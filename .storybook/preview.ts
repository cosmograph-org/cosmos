import type { Preview } from "@storybook/html";
import { themes } from '@storybook/theming';

import './style.css';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      disable: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: themes.dark,
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'light', value: '#fff' },
        { name: 'dark', value: '#192132' },
      ],
    },
  },
};

export default preview;
