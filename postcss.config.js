const loadPlugin = async (name) => {
  const mod = await import(name);
  return mod.default ?? mod;
};

const normalizePlugin = (plugin) => {
  if (typeof plugin === 'function' && !plugin.postcssPlugin) {
    return plugin();
  }
  return plugin;
};

export default async () => {
  let tailwindPlugin;
  try {
    tailwindPlugin = await loadPlugin('@tailwindcss/postcss');
  } catch (error) {
    tailwindPlugin = await loadPlugin('tailwindcss');
  }

  const autoprefixer = await loadPlugin('autoprefixer');

  return {
    plugins: [normalizePlugin(tailwindPlugin), normalizePlugin(autoprefixer)],
  };
};
