import adapter from '@sveltejs/adapter-node'; // Import the adapter
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Use the node adapter
    adapter: adapter()
  }
};

export default config;